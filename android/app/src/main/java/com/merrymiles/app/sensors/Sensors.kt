package com.merrymiles.app.sensors

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import kotlin.math.pow
import kotlin.math.sin

/**
 * Which Peloton this tablet is bolted to. Bike+, Tread and Row share one tablet model,
 * so Build.MODEL cannot tell them apart; Peloton's own "peloton_platform" setting can.
 */
enum class PelotonPlatform(val id: String, val kind: String, val label: String) {
    BIKE("v1", "bike", "Peloton Bike"),
    BIKE_PLUS("titan", "bike", "Peloton Bike+"),
    TREAD("prism", "tread", "Peloton Tread"),
    TREAD_PLUS("aurora", "tread", "Peloton Tread+"),
    NONE("", "bike", "Not a Peloton");

    companion object {
        fun detect(context: Context): PelotonPlatform {
            val id = try {
                Settings.Global.getString(context.contentResolver, "peloton_platform")
            } catch (e: Exception) {
                null
            }
            // treadmills report variants such as "prism-l"; match on the family name
            return values().firstOrNull { it.id.isNotEmpty() && id != null && (id == it.id || id.startsWith(it.id + "-")) } ?: NONE
        }
    }
}

/** One sensor sample, already in the units the game expects. */
sealed class Reading {
    abstract fun toJson(): String

    data class Bike(val cadenceRpm: Float, val resistance: Float, val powerWatts: Float) : Reading() {
        override fun toJson() =
            """{"kind":"bike","cadence":${n(cadenceRpm)},"resistance":${n(resistance)},"power":${n(powerWatts)}}"""
    }

    data class Tread(val speedMph: Float, val inclinePct: Float) : Reading() {
        override fun toJson() = """{"kind":"tread","speedMph":${n(speedMph)},"inclinePct":${n(inclinePct)}}"""
    }

    protected fun n(v: Float): String = if (v.isFinite()) v.toString() else "0"
}

interface SensorSource {
    /** Begin delivering readings. The callback may be invoked on any thread. */
    fun start(onReading: (Reading) -> Unit)
    fun stop()
}

/**
 * Peloton's sensor service. Every machine exposes it at the same package; you bind with an
 * intent whose ACTION is the interface name and whose package is AFFERNET_PACKAGE.
 * (Summary of reports/"Peloton tablet modding methods.md". The Tread part was checked against our
 * own treadmill's copy of the service on 17 November 2026, and the Bike part against our own bike's on 24 November.)
 *
 *   Bike   -> ACTION_BIKE       register a callback; each frame starts with four longs and two
 *                               ints: rpm, power (centiwatts), two internals, current resistance
 *                               (0-100), target resistance. Read those six and stop.
 *   Bike+  -> ACTION_BIKE_PLUS  polled for the same data. ACTION_BIKE binds here but stays silent.
 *   Tread  -> ACTION_TREAD      poll "current speed" (code 17) and "current incline" (code 18),
 *                               both in tenths. No callback, so no data layout to get wrong.
 *   Tread+ -> no known reader.
 *
 * Tell the machines apart with PelotonPlatform.detect, never by trying interfaces: some
 * versions hand a treadmill interface to a bike.
 *
 * SAFETY RULE FOR THE TREAD: the same service also accepts commands that move, lock and
 * unlock the machine (set speed 45, set incline 46, enable 54, unlock 73 and dozens more,
 * many undocumented). Our reader must go through one wrapper that allows codes 17 and 18
 * and refuses everything else. Never send, probe or "try out" any other code on a treadmill.
 * Leave Peloton's own treadmill software running: the service is reported to stop the belt
 * unless one of Peloton's screens is connected.
 */
object SensorSources {
    const val AFFERNET_PACKAGE = "com.onepeloton.affernetservice"
    const val AFFERNET_SERVICE = "com.onepeloton.affernetservice.AffernetService"
    const val ACTION_BIKE = "com.onepeloton.affernetservice.IV1Interface"
    const val ACTION_BIKE_PLUS = "com.onepeloton.affernetservice.IBikeInterface"
    const val ACTION_TREAD = "com.onepeloton.affernetservice.ITreadInterface"

    /**
     * Returns the reader for this machine, or null when there is none - in which case the
     * game shows its built-in simulator.
     *
     *   Tread: written (TreadReader.kt). Used only when the sensor service on the tablet is
     *          a version whose numbering we have read for ourselves; with any other version
     *          nothing is sent and the game stays on pretend speed.
     *   Bike:  written (BikeReader.kt), for the original Bike. It registers one listener and reads the first
     *          five numbers of each frame; like the treadmill's it is used only with a version of the
     *          service whose numbering and frame layout we have read for ourselves.
     *   Bike+: NOT WRITTEN (a different interface; one of its numbers moves the resistance motor).
     */
    fun create(context: Context, platform: PelotonPlatform, demo: String?): SensorSource? {
        if (demo != null) return DemoSensorSource(demo)
        val version = TreadSensorSource.serviceVersion(context)
        if (platform == PelotonPlatform.BIKE) {
            if (version !in BikeRequests.CHECKED_VERSIONS) {
                Log.w("MerryMiles", "bike: sensor service version $version has not been checked, so it is not being asked anything")
                return null
            }
            return BikeSensorSource(context)
        }
        if (platform != PelotonPlatform.TREAD) return null
        if (version !in TreadQuestions.CHECKED_VERSIONS) {
            Log.w("MerryMiles", "tread: sensor service version $version has not been checked, so it is not being asked anything")
            return null
        }
        return TreadSensorSource(context)
    }
}

/**
 * Made-up readings (a gentle, wandering workout) for the emulator, so the whole
 * tablet-to-game path can be tried without a Peloton attached.
 */
class DemoSensorSource(private val kind: String) : SensorSource {
    private val handler = Handler(Looper.getMainLooper())
    private var callback: ((Reading) -> Unit)? = null
    private var t = 0.0

    private val tick = object : Runnable {
        override fun run() {
            val cb = callback ?: return
            t += 0.1
            if (kind == "tread") {
                cb(Reading.Tread((3.3 + 0.7 * sin(t * 0.09)).toFloat(), (5.5 + 4.5 * sin(t * 0.05 + 2)).toFloat()))
            } else {
                val cadence = 80 + 13 * sin(t * 0.11) + 6 * sin(t * 0.37)
                val resistance = 41 + 11 * sin(t * 0.07 + 1)
                val power = 1.64e-4 * cadence.pow(1.35) * resistance.pow(2.05)
                cb(Reading.Bike(cadence.toFloat(), resistance.toFloat(), power.toFloat()))
            }
            handler.postDelayed(this, 100)
        }
    }

    override fun start(onReading: (Reading) -> Unit) {
        callback = onReading
        handler.removeCallbacks(tick)
        handler.post(tick)
    }

    override fun stop() {
        callback = null
        handler.removeCallbacks(tick)
    }
}
