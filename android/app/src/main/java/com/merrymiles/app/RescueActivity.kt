package com.merrymiles.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * The way out. A plain Android screen with no web page behind it, so it still works when
 * the game does not. It appears by itself when the game fails to load or keeps failing to
 * start, and can be opened on purpose from our Settings, or from the Mac with:
 *
 *   adb shell am start -n com.merrymiles.app/.RescueActivity
 *
 * Nothing here changes Peloton's software. Every button either opens something that was
 * already on the tablet or undoes something of ours.
 */
class RescueActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val why = when (intent.getStringExtra(EXTRA_REASON)) {
            "starts" -> "Awesome Workout World did not start properly several times in a row, so it has handed the Home button back to the tablet's original home screen."
            "load" -> "Awesome Workout World could not load its game."
            "crash" -> "Awesome Workout World's game stopped unexpectedly."
            else -> "Ways back to how the tablet was."
        }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(96, 64, 96, 64)
        }
        column.addView(text("Awesome Workout World rescue", 34f, Color.WHITE))
        column.addView(text(why, 18f, Color.rgb(200, 214, 255)))

        column.addView(action("Open the original home screen", "Peloton's own screens, exactly as they were. Awesome Workout World stays installed.") {
            if (!StockHome.open(this)) toast("No other home screen was found on this tablet.")
        })
        column.addView(action("Give the Home button back", "The tablet's Home button opens the original home screen again. Undo it any time in Awesome Workout World's Settings.") {
            StockHome.giveHomeBack(this)
            toast("Done. Home now opens the original home screen.")
        })
        column.addView(action("Use the built-in game", "Forget any game updates downloaded over Wi-Fi and go back to the version this app was installed with. Saved rides are kept.") {
            Updater.forgetDownloads(this)
            toast("Downloaded updates removed.")
        })
        column.addView(action("Android settings", "Wi-Fi, apps, and factory reset live here.") {
            startActivity(Intent(Settings.ACTION_SETTINGS))
        })
        column.addView(action("Try Awesome Workout World again", "Start it fresh.") {
            Health.confirm(this)
            startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
            finish()
        })
        column.addView(text("Removing Awesome Workout World completely: connect the Mac and run tools/tablet-restore.sh. Last resort: a factory reset from Android settings puts the whole tablet back to stock.", 14f, Color.rgb(150, 166, 214)))

        setContentView(ScrollView(this).apply {
            setBackgroundColor(Color.rgb(8, 14, 46))
            addView(column, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        })
    }

    private fun text(s: String, size: Float, color: Int) = TextView(this).apply {
        text = s
        textSize = size
        setTextColor(color)
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(0, 12, 0, 20)
    }

    private fun action(title: String, detail: String, run: () -> Unit): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, 10, 0, 10)
        addView(Button(this@RescueActivity).apply {
            text = title
            textSize = 20f
            isAllCaps = false
            setOnClickListener { run() }
        }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        addView(TextView(this@RescueActivity).apply {
            text = detail
            textSize = 14f
            setTextColor(Color.rgb(170, 186, 230))
            gravity = Gravity.CENTER_HORIZONTAL
        })
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()

    companion object {
        const val EXTRA_REASON = "reason"
    }
}
