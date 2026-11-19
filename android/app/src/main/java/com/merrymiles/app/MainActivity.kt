package com.merrymiles.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.os.Bundle
import android.os.Handler
import android.content.pm.PackageManager
import android.os.PowerManager
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import com.merrymiles.app.sensors.PelotonPlatform
import com.merrymiles.app.sensors.Reading
import com.merrymiles.app.sensors.SensorSource
import com.merrymiles.app.sensors.SensorSources
import org.json.JSONObject

/**
 * The whole app is one full-screen WebView showing the home screen and the game from /web.
 *
 * Normal launch: the game is served from inside the APK, or from a newer copy that the
 *                Updater downloaded (see Updater.kt).
 * Development:   adb shell am start -n com.merrymiles.app/.MainActivity --es url http://<mac-ip>:5173
 *                loads it live from the Mac's dev server instead, so game changes need no rebuild.
 * Other extras:  --es demo bike|tread     feed made-up sensor readings (emulator)
 *                --es update_url <url>    remember where game updates are downloaded from
 *                --es home_ok yes|no      (treadmills) may this tablet offer the Home switch
 *                --es scene "a=b&c=d"     open the game in a particular situation (see tools/android.sh scene)
 *
 * If a Peloton sensor reader exists for this machine, readings are pushed into the page
 * as window.MerryMiles.onTelemetry({...}). Otherwise the page falls back to its simulator.
 *
 * singleTask, and deliberately NOT excludeFromRecents: Peloton's software starts its own
 * screen after a long idle, and a task hidden from recents gets killed when that happens.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var updater: Updater
    private var source: SensorSource? = null
    private var bridge: HostBridge? = null
    private var lastPush = 0L
    private val main = Handler(Looper.getMainLooper())

    // Staying in front at start-up (see onPause).
    private val createdAt = SystemClock.elapsedRealtime()
    private var leftOnPurposeAt = -100_000L      // when WE last opened something else (an app, a settings page, the viewer)
    private var resumed = false
    private var comebacks = 0

    // Staying in front after a sleep. Peloton puts its set-up screen on top of us the moment
    // the screen goes OFF, so the tablet wakes up showing "Activate your Tread" instead of us.
    private var pausedAt = -100_000L
    private var frontAtSleep = false             // were we the page on screen when the tablet went to sleep?
    private var wokeAt = -100_000L
    private val screenWatch = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            val now = SystemClock.elapsedRealtime()
            when (i.action) {
                // (going to sleep pauses us a second or so BEFORE the screen is off)
                Intent.ACTION_SCREEN_OFF -> frontAtSleep = resumed || (now - pausedAt < 5000 && pausedAt - leftOnPurposeAt > 3000)
                Intent.ACTION_SCREEN_ON -> if (frontAtSleep && isHomeApp()) {
                    frontAtSleep = false
                    wokeAt = now
                    comebacks = 0
                    Log.i("MerryMiles", "front: awake again; making sure we are the page in front")
                    watchFront(longArrayOf(300, 1200, 2500, 4500, 8000), "after waking up")
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // Debug builds can be inspected from the Mac (chrome://inspect) while running on the tablet.
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) WebView.setWebContentsDebuggingEnabled(true)
        web = WebView(this)
        setContentView(web)
        goFullscreen()
        watchStartUp()
        registerReceiver(screenWatch, IntentFilter().apply { addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON) })

        // Dead man's switch: if we keep failing to start, stop being the home screen and offer the way out.
        if (Health.startAttempt(this) >= Health.LIMIT) {
            StockHome.giveHomeBack(this)
            rescue("starts")
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true                    // saved family rides live in localStorage
            mediaPlaybackRequiresUserGesture = false    // let the carols start on their own
        }

        updater = Updater(this) { state, message, version -> tellGame("onUpdate", JSONObject().put("state", state).put("message", message).put("version", version)) }
        intent.getStringExtra("update_url")?.let { updater.url = it }
        // The owner's say-so, from the Mac, that this treadmill may offer the Home switch (see HostBridge.canBeHome).
        intent.getStringExtra("home_ok")?.let {
            getSharedPreferences(HostBridge.PREFS, MODE_PRIVATE).edit().putBoolean(HostBridge.HOME_OK, it == "yes").apply()
        }
        updater.rejectIfUnproven()

        // Every game file is served at https://appassets.androidplatform.net/app/..., from the
        // newest good copy we have. One fixed address means saved data survives updates.
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/app/") { path ->
                val file = path.ifEmpty { "index.html" }
                updater.open(file)?.let { WebResourceResponse(mimeOf(file), null, it) }
            }
            .build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            // the game page itself would not load
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) rescue("load")
            }

            // the WebView's process died under us: this view is unusable from here on
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                rescue("crash")
                finish()
                return true
            }
        }

        // "demo" is for the emulator: adb shell am start ... --es demo bike   (or tread)
        val demo = intent.getStringExtra("demo")?.takeIf { it == "bike" || it == "tread" }
        val platform = PelotonPlatform.detect(this)
        source = SensorSources.create(this, platform, demo)
        val kind = when {
            source == null -> "none"          // no reader yet: the game shows its simulator
            demo != null -> demo
            else -> platform.kind
        }
        val label = if (demo != null) "Demo $demo" else platform.label
        // what this machine calls its file in the family's shared log
        val machine = when {
            demo != null || platform == PelotonPlatform.NONE -> "tablet"
            platform.kind == "tread" -> "treadmill"
            else -> "bike"
        }
        bridge = HostBridge(this, kind, label, platform.id, updater, SaveFile(this), Sync(this, machine, ::tellGame), ::tellGame) { loadGame() }.also { web.addJavascriptInterface(it, "MerryHost") }

        loadGame()
    }

    /** (Re)load the game. A bundle on probation gets 30 seconds to report that it started. */
    private fun loadGame() {
        main.removeCallbacksAndMessages(PROBATION)
        // "scene" (test builds) is passed to the page as its query string
        val scene = intent.getStringExtra("scene")?.takeIf { it.isNotBlank() }?.let { "?$it" } ?: ""
        web.loadUrl((intent.getStringExtra("url") ?: GAME_URL) + scene)
        if (updater.onProbation) {
            main.postAtTime({
                if (updater.rejectIfUnproven()) {
                    Log.w(Updater.TAG, "reloading the built-in game after a failed update")
                    web.loadUrl(GAME_URL)
                }
            }, PROBATION, SystemClock.uptimeMillis() + 30_000)
        }
    }

    private fun rescue(reason: String) {
        startActivity(Intent(this, RescueActivity::class.java).putExtra(RescueActivity.EXTRA_REASON, reason))
    }

    /** Pressing Home while we are the home screen arrives here: take the page back to the launcher. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.hasCategory(Intent.CATEGORY_HOME)) web.evaluateJavascript("window.merry&&window.merry.homePressed&&window.merry.homePressed()", null)
    }

    override fun onResume() {
        super.onResume()
        resumed = true
        goFullscreen()
        source?.start { push(it) }
    }

    /**
     * Everything this app opens (another app, Peloton's home, a settings page, our own
     * viewer) comes through here, so we know when being covered was our own doing.
     */
    @Deprecated("Deprecated in Java")
    override fun startActivityForResult(intent: Intent?, requestCode: Int, options: Bundle?) {
        leftOnPurposeAt = SystemClock.elapsedRealtime()
        @Suppress("DEPRECATION")
        super.startActivityForResult(intent, requestCode, options)
    }

    /**
     * On a Peloton with no membership, Peloton's own set-up screen ("Activate your Tread")
     * starts itself a moment after the tablet does, or after we restart, and sits on top of
     * us. So: if we are the home app, and we are covered by something we did not open, in
     * the first few minutes after the tablet starts or the first half minute after we do,
     * we come straight back to the front. A few times at most, so it can never become a
     * tug of war. Any later than that, whatever covers us is left alone: it may be
     * something the rider needs to see.
     *
     * The same goes for the half minute after the tablet wakes up, if we were the page on
     * screen when it went to sleep (screenWatch above).
     */
    override fun onPause() {
        resumed = false
        pausedAt = SystemClock.elapsedRealtime()
        source?.stop()
        super.onPause()
        val now = SystemClock.elapsedRealtime()
        if (!shouldComeBack()) return
        comebacks++
        Log.w("MerryMiles", "front: covered at start-up by something we did not open; coming back (time $comebacks)")
        comeForward()                                    // while we are still on screen, Android lets us
        main.postDelayed({ if (!resumed) comeForward() }, 900)
    }

    private fun shouldComeBack(): Boolean {
        val now = SystemClock.elapsedRealtime()
        val ourDoing = now - leftOnPurposeAt < 3000
        val startingUp = now < 5 * 60_000 || now - createdAt < 30_000 || now - wokeAt < 30_000      // (elapsedRealtime counts from when the tablet started)
        val awake = (getSystemService(POWER_SERVICE) as PowerManager).isInteractive
        return !ourDoing && startingUp && awake && !isFinishing && comebacks < 4 && isHomeApp()
    }

    /**
     * The same, for when Peloton's screen gets in before we have even appeared (so onPause
     * never runs): look a few times in our first seconds, and step forward if we are not there.
     */
    private fun watchStartUp() = watchFront(longArrayOf(2000, 4500, 8000), "before we appeared")

    private fun watchFront(waits: LongArray, whenText: String) {
        for (wait in waits) {
            main.postDelayed({
                if (!resumed && shouldComeBack()) {
                    comebacks++
                    Log.w("MerryMiles", "front: something is in front of us $whenText; coming forward (time $comebacks)")
                    comeForward()
                }
            }, wait)
        }
    }

    private fun comeForward() {
        try {
            @Suppress("DEPRECATION")
            super.startActivityForResult(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP), -1, null)
        } catch (e: Exception) {
            Log.w("MerryMiles", "front: could not come back: $e")
        }
    }

    private fun isHomeApp(): Boolean {
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return packageManager.resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName == packageName
    }

    override fun onDestroy() {
        try { unregisterReceiver(screenWatch) } catch (e: Exception) { /* was never registered */ }
        main.removeCallbacksAndMessages(null)
        bridge?.shutdown()
        web.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) goFullscreen()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Back never closes us (we may be the home screen); the page decides what "back" means.
        web.evaluateJavascript("window.merry&&window.merry.backPressed&&window.merry.backPressed()", null)
    }

    /** Sensor callbacks can arrive ~20x a second on any thread; forward at most ~12x a second. */
    private fun push(reading: Reading) {
        val now = SystemClock.uptimeMillis()
        if (now - lastPush < 80) return
        lastPush = now
        val js = "window.MerryMiles&&window.MerryMiles.onTelemetry(${reading.toJson()})"
        web.post { web.evaluateJavascript(js, null) }
    }

    private fun tellGame(hook: String, data: JSONObject) {
        val js = "window.MerryMiles&&window.MerryMiles.$hook&&window.MerryMiles.$hook($data)"
        web.post { web.evaluateJavascript(js, null) }
    }

    private fun mimeOf(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "svg" -> "image/svg+xml"
        "mp3" -> "audio/mpeg"
        "ogg" -> "audio/ogg"
        "wav" -> "audio/wav"
        else -> "application/octet-stream"
    }

    @Suppress("DEPRECATION")
    private fun goFullscreen() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
    }

    private companion object {
        const val GAME_URL = "https://appassets.androidplatform.net/app/index.html"
        val PROBATION = Any()
    }
}
