package com.merrymiles.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Everything in this file exists so that nothing we do to a tablet is a one-way door:
 * finding and opening the tablet's original home screen, handing the Home button back,
 * noticing when our own app is not starting properly, and keeping the family's save data
 * in a plain file that can be copied off the tablet and put back.
 */

/** The home screen the tablet shipped with (Peloton's, on a Peloton; the stock launcher on an emulator). */
object StockHome {
    fun find(context: Context): ComponentName? {
        val homes = context.packageManager
            .queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)
            .map { it.activityInfo }
            .filter { it.packageName != context.packageName && it.packageName != "com.android.settings" }
        val pick = homes.firstOrNull { it.packageName.contains("peloton", ignoreCase = true) } ?: homes.firstOrNull() ?: return null
        return ComponentName(pick.packageName, pick.name)
    }

    /** Bring the original home screen to the front. We stay installed and untouched. */
    fun open(context: Context): Boolean {
        val home = find(context) ?: return false
        return try {
            context.startActivity(
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).setComponent(home).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            true
        } catch (e: Exception) {
            Log.w("MerrySafety", "could not open the original home screen", e)
            false
        }
    }

    /** Stop offering ourselves as the home screen, so the Home button goes back to the original. */
    fun giveHomeBack(context: Context) {
        context.packageManager.setComponentEnabledSetting(
            ComponentName(context, "${context.packageName}.HomeAlias"),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
    }
}

/**
 * A dead man's switch. Every launch counts as an attempt; the game clears the count when it
 * reports that it is up and drawing. Three attempts in a row with no report means something
 * is badly wrong with us, and the tablet should not be left depending on us as its home screen.
 */
object Health {
    const val LIMIT = 3
    private fun prefs(context: Context) = context.getSharedPreferences("health", Context.MODE_PRIVATE)

    fun startAttempt(context: Context): Int {
        val n = prefs(context).getInt("starts", 0) + 1
        prefs(context).edit().putInt("starts", n).apply()
        return n
    }

    fun confirm(context: Context) = prefs(context).edit().putInt("starts", 0).apply()
}

/**
 * The family's save data as an ordinary file, outside the WebView's private storage,
 * with one dated copy per day kept alongside. tools/tablet-backup.sh copies the folder to
 * the Mac (through `adb run-as`, which works because we install debug builds; Android 11
 * no longer lets adb read an app's shared-storage folder). A file named restore.json
 * dropped into the same folder is merged in on the next start.
 */
class SaveFile(context: Context) {
    private val dir: File = File(context.filesDir, "save").apply { mkdirs() }
    private val save = File(dir, "save.json")
    private val restore = File(dir, "restore.json")
    private var restoreServed = false

    /** {"save": "...", "restore": "..."} - either may be missing. */
    fun read(): String {
        val out = JSONObject()
        try { if (save.isFile) out.put("save", save.readText()) } catch (e: Exception) { Log.w("MerrySafety", "could not read save.json", e) }
        try {
            if (restore.isFile) { out.put("restore", restore.readText()); restoreServed = true }
        } catch (e: Exception) {
            Log.w("MerrySafety", "could not read restore.json", e)
        }
        return out.toString()
    }

    @Synchronized
    fun write(json: String) {
        try {
            val tmp = File(dir, "save.json.tmp")
            tmp.writeText(json)
            if (!tmp.renameTo(save)) { save.writeText(json); tmp.delete() }
            // one copy per calendar day, so an accident can be rewound to yesterday
            File(dir, "save-${SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())}.json").writeText(json)
            dir.listFiles { f -> f.name.startsWith("save-") && f.name.endsWith(".json") }
                ?.sortedByDescending { it.name }?.drop(KEEP_DAYS)?.forEach { it.delete() }
            // the page has now merged any restore file into what it just saved
            if (restoreServed) { restore.delete(); restoreServed = false }
        } catch (e: Exception) {
            Log.w("MerrySafety", "could not write the save file", e)
        }
    }

    private companion object {
        const val KEEP_DAYS = 30
    }
}
