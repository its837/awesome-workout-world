package com.merrymiles.app.sensors

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Parcel
import android.util.Log

/**
 * The ONLY door between this app and the treadmill's sensor service.
 *
 * It can ask two questions, "what is the belt speed" and "what is the incline", and nothing
 * else. That is not a matter of being careful: the two question numbers live in the enum
 * below, ask() takes one of those two and no number, and nothing is ever put into a
 * request except the name of the interface. There is no way to reach, from anywhere in
 * the app, any of the service's other numbers (many of which move, lock or unlock the belt).
 *
 * The numbers are positions in Peloton's interface, so a different version of the service
 * could in principle number things differently. They were confirmed for version 3.3.6 by
 * reading that version's own code, copied off our treadmill on 17 November 2026: number 17
 * leads to the routine Peloton labels "getCurrentSpeed" and 18 to "getCurrentIncline";
 * each takes nothing and answers with one whole number. Any other version is not spoken
 * to until someone has checked it the same way (see CHECKED_VERSIONS and
 * docs/BIKE_AND_TREADMILL.md).
 */
internal class TreadQuestions(private val binder: IBinder) {
    enum class Question(internal val number: Int) { CURRENT_SPEED(17), CURRENT_INCLINE(18) }

    /** The answer in tenths (of a mile an hour, or of a percent), or null if there was none. */
    fun ask(question: Question): Int? {
        val request = Parcel.obtain()
        val answer = Parcel.obtain()
        return try {
            request.writeInterfaceToken(INTERFACE)
            if (!binder.transact(question.number, request, answer, 0)) return null
            answer.readException()
            answer.readInt()
        } catch (e: Exception) {
            null
        } finally {
            request.recycle()
            answer.recycle()
        }
    }

    companion object {
        const val INTERFACE = SensorSources.ACTION_TREAD
        /** Versions of Peloton's sensor service whose numbering we have read for ourselves. */
        val CHECKED_VERSIONS = setOf("3.3.6")
    }
}

/**
 * Belt speed and incline from a Peloton Tread, asked twice a second while the app is in
 * front (MainActivity starts this when it comes forward and stops it when it leaves, so a
 * sleeping tablet is never prodded). It listens for nothing and registers nowhere: Peloton's
 * own software stays in charge of the belt and never hears about us.
 */
class TreadSensorSource(private val context: Context) : SensorSource {
    private var connection: ServiceConnection? = null
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    @Volatile private var questions: TreadQuestions? = null
    @Volatile private var callback: ((Reading) -> Unit)? = null
    private var told = 0L

    private val poll = object : Runnable {
        override fun run() {
            val q = questions
            val cb = callback
            if (q != null && cb != null) {
                val speed = q.ask(TreadQuestions.Question.CURRENT_SPEED)
                val incline = q.ask(TreadQuestions.Question.CURRENT_INCLINE)
                // anything outside what a treadmill can do is not a reading: say nothing
                if (speed != null && incline != null && speed in 0..200 && incline in -100..300) {
                    cb(Reading.Tread(speed / 10f, incline / 10f))
                    val now = System.currentTimeMillis()
                    if (now - told > 15_000) { told = now; Log.w(TAG, "tread: speed ${speed / 10f} mph, incline ${incline / 10f} %") }
                } else if (System.currentTimeMillis() - told > 15_000) {
                    told = System.currentTimeMillis()
                    Log.w(TAG, "tread: no usable answer (speed $speed, incline $incline)")
                }
            }
            handler?.postDelayed(this, 500)
        }
    }

    override fun start(onReading: (Reading) -> Unit) {
        stop()
        callback = onReading
        val worker = HandlerThread("tread-reader").also { it.start() }
        thread = worker
        handler = Handler(worker.looper)
        val link = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, binder: IBinder) {
                Log.w(TAG, "tread: connected to Peloton's sensor service")
                questions = TreadQuestions(binder)
                handler?.post(poll)
            }
            override fun onServiceDisconnected(name: ComponentName) { questions = null }
        }
        val intent = Intent(SensorSources.ACTION_TREAD).setPackage(SensorSources.AFFERNET_PACKAGE)
        val bound = try { context.bindService(intent, link, Context.BIND_AUTO_CREATE) } catch (e: Exception) { false }
        if (bound) connection = link else Log.w(TAG, "tread: Peloton's sensor service would not connect")
    }

    override fun stop() {
        callback = null
        questions = null
        handler?.removeCallbacksAndMessages(null)
        connection?.let { try { context.unbindService(it) } catch (e: Exception) { /* already gone */ } }
        connection = null
        thread?.quitSafely()
        thread = null
        handler = null
    }

    companion object {
        private const val TAG = "MerryMiles"

        /** Is the sensor service on this tablet a version whose numbering we have checked? */
        fun serviceVersion(context: Context): String? = try {
            context.packageManager.getPackageInfo(SensorSources.AFFERNET_PACKAGE, 0).versionName
        } catch (e: Exception) {
            null
        }
    }
}
