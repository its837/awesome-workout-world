package com.merrymiles.app.sensors

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Binder
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Parcel
import android.util.Log

/**
 * The ONLY door between this app and the bike's sensor service.
 *
 * It can say two things: "tell me the bike's numbers" and "stop telling me". That is not a
 * matter of being careful: the two request numbers live in the enum below, send() takes one
 * of those two and no number, and nothing is ever put into a request except the name of the
 * interface, our listener and our own name. There is no way to reach, from anywhere in the
 * app, any of the service's other seventeen numbers (which switch on fake data, change the
 * report rate, calibrate the bike and write its serial number).
 *
 * The numbers are positions in Peloton's interface, so a different version of the service
 * could number things differently. They were confirmed for version 3.4.1 by reading that
 * version's own code, copied off our bike on 24 November 2026 (its code is byte for byte
 * the treadmill's copy): number 1 leads to the routine that logs "registerCallback" and
 * number 2 to "unregisterCallback"; each takes a listener and a name and answers with
 * nothing. Any other version is not spoken to until someone has checked it the same way
 * (see CHECKED_VERSIONS and docs/BIKE_AND_TREADMILL.md).
 */
internal class BikeRequests(private val binder: IBinder) {
    enum class Request(internal val number: Int) { LISTEN(1), STOP_LISTENING(2) }

    /** True if the service took the request. */
    fun send(request: Request, listener: IBinder): Boolean {
        val data = Parcel.obtain()
        val answer = Parcel.obtain()
        return try {
            data.writeInterfaceToken(INTERFACE)
            data.writeStrongBinder(listener)
            data.writeString(OUR_NAME)
            if (!binder.transact(request.number, data, answer, 0)) return false
            answer.readException()
            true
        } catch (e: Exception) {
            false
        } finally {
            data.recycle()
            answer.recycle()
        }
    }

    companion object {
        const val INTERFACE = SensorSources.ACTION_BIKE
        /** What the service calls the thing it sends frames to. */
        const val LISTENER = "com.onepeloton.affernetservice.IV1Callback"
        /** Our own name on the service's list of listeners: never one of Peloton's. */
        const val OUR_NAME = "com.merrymiles.app"
        /** Versions of Peloton's sensor service whose numbering and frame layout we have read for ourselves. */
        val CHECKED_VERSIONS = setOf("3.4.1")
    }
}

/**
 * Cadence, resistance and power from an original Peloton Bike, while the app is in front
 * (MainActivity starts this when it comes forward and stops it when it leaves).
 *
 * It only listens. It registers one listener under our own name and is then sent frames;
 * each frame begins with four whole numbers and two more (in 3.4.1: mRPM, mPower,
 * mStepperMotorPosition, mLoadCellReading, mCurrentResistance, mTargetResistance, read from
 * that version's own BikeData.writeToParcel). We read the first five and stop: whatever
 * follows may change between versions and is none of our business. Power arrives in
 * hundredths of a watt. Peloton's own software keeps running and is not asked for anything.
 */
class BikeSensorSource(private val context: Context) : SensorSource {
    private var connection: ServiceConnection? = null
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    @Volatile private var requests: BikeRequests? = null
    @Volatile private var callback: ((Reading) -> Unit)? = null
    @Volatile private var latest: Reading.Bike? = null
    @Volatile private var latestAt = 0L
    @Volatile private var frames = 0
    private var told = 0L

    /** What the service sends frames to. Frame number 1 is the bike's numbers; the other two are not readings. */
    private val listener = object : Binder() {
        override fun onTransact(code: Int, data: Parcel, reply: Parcel?, flags: Int): Boolean {
            if (code != FRAME) return if (code == INTERFACE_TRANSACTION) super.onTransact(code, data, reply, flags) else true
            try {
                data.enforceInterface(BikeRequests.LISTENER)
                if (data.readInt() == 0) return true                  // no frame inside
                val rpm = data.readLong()
                val centiwatts = data.readLong()
                data.readLong()                                        // stepper motor position: not ours
                data.readLong()                                        // load cell reading: not ours
                val resistance = data.readInt()
                // anything outside what a bike can do is not a reading: say nothing
                if (rpm in 0..250 && centiwatts in 0..300_000 && resistance in 0..100) {
                    latest = Reading.Bike(rpm.toFloat(), resistance.toFloat(), centiwatts / 100f)
                    latestAt = System.currentTimeMillis()
                    frames++
                }
            } catch (e: Exception) {
                // a frame we could not read: say nothing
            }
            return true
        }
    }

    /** Twice a second: hand the game the newest frame, while it is fresh. (Frames come at the service's own pace.) */
    private val tick = object : Runnable {
        override fun run() {
            val cb = callback
            val now = System.currentTimeMillis()
            val reading = latest
            if (cb != null && reading != null && now - latestAt < 4_000) cb(reading)
            if (now - told > 15_000) {
                told = now
                if (reading != null && now - latestAt < 4_000) Log.w(TAG, "bike: cadence ${reading.cadenceRpm} rpm, resistance ${reading.resistance}, power ${reading.powerWatts} W ($frames frames in 15 s)")
                else Log.w(TAG, "bike: no frames from Peloton's sensor service")
                frames = 0
            }
            handler?.postDelayed(this, 500)
        }
    }

    override fun start(onReading: (Reading) -> Unit) {
        stop()
        callback = onReading
        val worker = HandlerThread("bike-reader").also { it.start() }
        thread = worker
        handler = Handler(worker.looper)
        val link = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, binder: IBinder) {
                val r = BikeRequests(binder)
                requests = r
                val ok = r.send(BikeRequests.Request.LISTEN, listener)
                Log.w(TAG, if (ok) "bike: connected to Peloton's sensor service, listening" else "bike: Peloton's sensor service would not let us listen")
                told = System.currentTimeMillis()
                handler?.post(tick)
            }
            override fun onServiceDisconnected(name: ComponentName) { requests = null }
        }
        val intent = Intent(SensorSources.ACTION_BIKE).setPackage(SensorSources.AFFERNET_PACKAGE)
        val bound = try { context.bindService(intent, link, Context.BIND_AUTO_CREATE) } catch (e: Exception) { false }
        if (bound) connection = link else Log.w(TAG, "bike: Peloton's sensor service would not connect")
    }

    override fun stop() {
        callback = null
        requests?.send(BikeRequests.Request.STOP_LISTENING, listener)
        requests = null
        latest = null
        handler?.removeCallbacksAndMessages(null)
        connection?.let { try { context.unbindService(it) } catch (e: Exception) { /* already gone */ } }
        connection = null
        thread?.quitSafely()
        thread = null
        handler = null
    }

    companion object {
        private const val TAG = "MerryMiles"
        /** The listener's frame of numbers (the service's own number for it). */
        private const val FRAME = 1
    }
}
