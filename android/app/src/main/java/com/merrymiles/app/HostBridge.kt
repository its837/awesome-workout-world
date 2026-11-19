package com.merrymiles.app

import android.app.Activity
import android.app.role.RoleManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.Locale

/**
 * What the page can ask the tablet for. Exposed to it as window.MerryHost.
 * Keep this surface small: which machine this is, speak Santa's greeting, open something
 * to watch, game updates, and a couple of launcher chores. There is deliberately nothing
 * here that controls the machine.
 *
 * kind is "bike", "tread", or "none" when no sensor reader is available (the game then
 * uses its on-screen simulator).
 */
class HostBridge(
    private val activity: Activity,
    private val kind: String,
    private val label: String,
    private val platformId: String,
    private val updater: Updater,
    private val saveFile: SaveFile,
    private val sync: Sync,
    private val tellGame: (String, JSONObject) -> Unit,
    private val reloadGame: () -> Unit,
) : TextToSpeech.OnInitListener {
    private val tts = TextToSpeech(activity.applicationContext, this)
    @Volatile private var ttsReady = false
    private val asked = ConcurrentHashMap<String, String>()   // sentences being made into sound files, by id
    @Volatile private var count = 0

    override fun onInit(status: Int) {
        // no speech engine: the game still plays its synth "ho ho ho"
        if (status != TextToSpeech.SUCCESS) { Log.w(TAG, "speech: no engine would start (status $status)"); return }
        val language = tts.setLanguage(Locale.US)
        // Every step is written to the log as a warning (tools/android.sh voice reads them):
        // the first real tablet had an engine, took our words, and stayed silent.
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) { Log.w(TAG, "speech: the engine started on $id") }
            override fun onDone(id: String?) { finished(id) }
            @Deprecated("Deprecated in Java")
            override fun onError(id: String?) { failed(id, -1) }
            override fun onError(id: String?, code: Int) { failed(id, code) }
        })
        ttsReady = true
        val voices = try { tts.voices?.size ?: 0 } catch (e: Exception) { -1 }
        Log.w(TAG, "speech: engine ${tts.defaultEngine}; engines here ${tts.engines.map { it.name }}; US English answer $language (0 or more is good); voices $voices")
    }

    @JavascriptInterface
    fun getMachineInfo(): String = JSONObject()
        .put("kind", kind)
        .put("model", label)
        .put("platform", platformId)
        .toString()

    @JavascriptInterface
    fun speak(text: String) {
        if (!ttsReady) { Log.w(TAG, "speech: asked to speak, but no engine is ready"); return }
        // The engine's voice is whatever the tablet has (the Peloton treadmill: one, a
        // woman's, and it ignores requests for a lower pitch). So the words are made into a
        // sound file and handed to the game, which plays them low and robotic through its
        // own sound engine (audio.js, playSpeech). If that fails the engine speaks them itself.
        val id = "file-${++count}"
        asked[id] = text
        val answer = try { tts.synthesizeToFile(text, Bundle(), File(activity.cacheDir, "$id.wav"), id) } catch (e: Exception) { TextToSpeech.ERROR }
        if (answer != TextToSpeech.SUCCESS) { asked.remove(id); aloud(text) }
    }

    /** The engine speaking in its own voice, through the same loudspeaker channel as the music. */
    private fun aloud(text: String) {
        val how = Bundle().apply {
            putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC)
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1f)
        }
        val answer = tts.speak(text, TextToSpeech.QUEUE_FLUSH, how, "aloud")
        Log.w(TAG, if (answer == TextToSpeech.SUCCESS) "speech: speaking in the engine's own voice" else "speech: the engine refused the words (answer $answer)")
    }

    private fun finished(id: String?) {
        val text = asked.remove(id ?: return)
        if (text == null) { Log.w(TAG, "speech: the engine says it finished $id"); return }
        val file = File(activity.cacheDir, "$id.wav")
        val bytes = try { if (file.length() in 45..4_000_000) file.readBytes() else null } catch (e: Exception) { null }
        file.delete()
        if (bytes == null) { Log.w(TAG, "speech: no usable sound file came back"); aloud(text); return }
        Log.w(TAG, "speech: ${bytes.size / 1024} KB of sound handed to the game")
        tellGame("onSpeech", JSONObject().put("wav", Base64.encodeToString(bytes, Base64.NO_WRAP)))
    }

    private fun failed(id: String?, code: Int) {
        Log.w(TAG, "speech: the engine reported error $code on $id")
        val text = asked.remove(id ?: return) ?: return
        File(activity.cacheDir, "$id.wav").delete()
        aloud(text)
    }

    /**
     * Open YouTube or Netflix: the real app if it is installed on the tablet (Peloton
     * ships Netflix on the treadmill), otherwise YouTube's website in our own full-screen
     * viewer. The page only passes a short key; the app names and addresses are fixed here.
     */
    @JavascriptInterface
    fun openService(key: String): Boolean {
        val service = SERVICES[key] ?: return false
        val pm = activity.packageManager
        for (pkg in service.packages) {
            val launch = pm.getLaunchIntentForPackage(pkg) ?: continue
            start(launch)
            return true
        }
        // No app. Netflix's website refuses a viewer like ours ("Update required"), so there
        // we say the app is not here yet (the page shows the message). YouTube's website
        // does open, signed out.
        if (!service.siteWorks) return false
        activity.runOnUiThread {
            activity.startActivity(Intent(activity, WatchActivity::class.java).putExtra(WatchActivity.EXTRA_URL, service.site))
        }
        return true
    }

    // --- everything else on the tablet (the ALL APPS page) ----------------------

    /**
     * The apps a person could want to open: everything with an icon, less ourselves and
     * less the makers' own tools. On a Peloton those include factory tests, firmware
     * updaters and sensor diagnostics, which nobody should open by accident on a machine
     * with a belt. Peloton's home screen is offered separately (openPeloton).
     * JSON: [{ pkg, name, icon (a small PNG as a data: address) }], by name.
     */
    @JavascriptInterface
    fun listApps(): String {
        val pm = activity.packageManager
        val out = JSONArray()
        val seen = HashSet<String>()
        val found = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
            .map { it to it.loadLabel(pm).toString() }
            .sortedBy { it.second.lowercase(Locale.US) }
        for ((info, name) in found) {
            val pkg = info.activityInfo.packageName
            if (!offered(pkg) || !seen.add(pkg)) continue
            val icon = try { picture(info.loadIcon(pm)) } catch (e: Exception) { "" }
            out.put(JSONObject().put("pkg", pkg).put("name", name).put("icon", icon))
        }
        return out.toString()
    }

    /** Open one of the apps listApps() offers. Nothing else can be opened this way. */
    @JavascriptInterface
    fun openApp(pkg: String): Boolean {
        if (!offered(pkg)) return false
        val launch = activity.packageManager.getLaunchIntentForPackage(pkg) ?: return false
        start(launch)
        return true
    }

    private fun offered(pkg: String): Boolean =
        pkg != activity.packageName && HIDDEN.none { pkg == it || pkg.startsWith("$it.") }

    private fun start(launch: Intent) {
        activity.runOnUiThread {
            try { activity.startActivity(launch) } catch (e: Exception) { Log.w(TAG, "could not open ${launch.`package`}: $e") }
        }
    }

    /** An app's icon as a 48 by 48 PNG: small, so it turns into chunky pixels like everything else. */
    private fun picture(icon: Drawable): String {
        val bitmap = Bitmap.createBitmap(48, 48, Bitmap.Config.ARGB_8888)
        icon.setBounds(0, 0, 48, 48)
        icon.draw(Canvas(bitmap))
        val bytes = ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    // --- game updates (see Updater.kt) ---------------------------------------

    @JavascriptInterface
    fun getUpdateInfo(): String {
        val m = updater.activeManifest()
        return JSONObject()
            .put("version", m.optString("version", "?"))
            .put("build", m.optLong("build", 0))
            .put("source", if (updater.activeDir() != null) "downloaded" else "built-in")
            .put("url", updater.url)
            .toString()
    }

    @JavascriptInterface
    fun checkForUpdate() = updater.check()

    /** Switch to the downloaded version and restart the game. */
    @JavascriptInterface
    fun applyUpdate() {
        if (updater.apply()) activity.runOnUiThread { reloadGame() }
    }

    /** The game calls this once it is up and drawing; it ends a new update's probation. */
    @JavascriptInterface
    fun bundleReady() {
        updater.confirm()
        Health.confirm(activity)
    }

    // --- the family's save data, mirrored to a plain file (see SaveFile in Safety.kt) ---

    /** JSON {"save": "...", "restore": "..."}; either may be absent. */
    @JavascriptInterface
    fun readSave(): String = saveFile.read()

    @JavascriptInterface
    fun writeSave(json: String) = saveFile.write(json)

    // --- the family's log, kept in step between the machines (see Sync.kt) ------------

    /** Send our rides and fetch the other machines'. The answer comes back as MerryMiles.onSync(...). */
    @JavascriptInterface
    fun syncNow(save: String) = sync.run(save)

    /** JSON { on, machine, last, message }. */
    @JavascriptInterface
    fun getSyncStatus(): String = sync.status().toString()

    // --- ways back (see Safety.kt and RescueActivity.kt) ---------------------------

    /** Bring the tablet's original home screen (Peloton's) to the front. False if there is none. */
    @JavascriptInterface
    fun openPeloton(): Boolean {
        var ok = false
        val done = java.util.concurrent.CountDownLatch(1)
        activity.runOnUiThread { ok = StockHome.open(activity); done.countDown() }
        done.await(2, java.util.concurrent.TimeUnit.SECONDS)
        return ok
    }

    @JavascriptInterface
    fun openRescue() {
        activity.runOnUiThread { activity.startActivity(Intent(activity, RescueActivity::class.java)) }
    }

    /**
     * On a treadmill we do not take over the Home button unless the owner has said so for
     * that one tablet: Peloton's software has to stay in charge of the belt, and we change
     * as little as possible there. Saying so is a deliberate act from the Mac
     * (tools/android.sh home-ok yes), never a switch a child could find on the screen.
     *
     * Otherwise the answer is yes only where we KNOW it is a bike: Peloton's own setting
     * says so. On a Peloton tablet where that setting cannot be read, the answer is no.
     * (The model name cannot settle it: the Tread, the Bike+ and the Row share a tablet.)
     * Something that is not a Peloton at all, like the emulator, has no belt to worry about.
     */
    @JavascriptInterface
    fun canBeHome(): Boolean = when {
        kind == "tread" || platformId.startsWith("prism") || platformId.startsWith("aurora") -> homeOkHere()
        platformId == "v1" || platformId == "titan" -> true
        else -> !isPelotonTablet()
    }

    private fun homeOkHere(): Boolean =
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(HOME_OK, false)

    private fun isPelotonTablet(): Boolean =
        Build.MANUFACTURER.contains("peloton", ignoreCase = true) || Build.BRAND.contains("peloton", ignoreCase = true) || Build.MODEL.startsWith("PLTN", ignoreCase = true)

    /**
     * A line for the Mac to read out of the tablet's log (tools/android.sh speedtest).
     * Written as a WARNING on purpose: the real tablets are reported to throw ordinary log
     * lines away, and whatever the page writes to its own console counts as ordinary.
     */
    @JavascriptInterface
    fun note(text: String) { Log.w(TAG, text.take(3500)) }

    // --- loudness, and the tablet's own Bluetooth and Wi-Fi pages -------------------
    // (The tablets' volume buttons are round the back of the screen.)

    private val audio: AudioManager get() = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /** The tablet's volume for music and video: JSON { level, max }. */
    @JavascriptInterface
    fun getVolume(): String = JSONObject()
        .put("level", audio.getStreamVolume(AudioManager.STREAM_MUSIC))
        .put("max", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
        .toString()

    /** One step louder (a positive number) or quieter (a negative one). Answers like getVolume. */
    @JavascriptInterface
    fun changeVolume(step: Int): String {
        try {
            audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, if (step > 0) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER, 0)
        } catch (e: Exception) {
            Log.w(TAG, "volume: the tablet would not change it: $e")
        }
        return getVolume()
    }

    /** One of Android's own settings pages: "bluetooth" or "wifi". Anything else is ignored. */
    @JavascriptInterface
    fun openSettingsPage(which: String) {
        val action = when (which) {
            "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "wifi" -> Settings.ACTION_WIFI_SETTINGS
            else -> return
        }
        start(Intent(action))
    }

    // --- launcher chores ---------------------------------------------------------

    @JavascriptInterface
    fun openAndroidSettings() {
        activity.runOnUiThread { activity.startActivity(Intent(Settings.ACTION_SETTINGS)) }
    }

    /** Are we what the Home button goes to? */
    @JavascriptInterface
    fun isHome(): Boolean {
        if (Build.VERSION.SDK_INT >= 29) {
            // Android 10+: "home" is a role the person grants; being a candidate is not enough
            val roles = activity.getSystemService(RoleManager::class.java)
            if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_HOME)) return roles.isRoleHeld(RoleManager.ROLE_HOME)
        }
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val who = activity.packageManager.resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY)
        return who?.activityInfo?.packageName == activity.packageName
    }

    /**
     * Offer ourselves as the tablet's home screen (or stop offering). The HOME entry point
     * is a separate alias that is switched off until asked for, so installing the app never
     * changes what the Home button does. Android then asks the person to confirm.
     */
    @JavascriptInterface
    fun setHome(on: Boolean) {
        if (on && !canBeHome()) return
        val alias = ComponentName(activity, "${activity.packageName}.HomeAlias")
        activity.packageManager.setComponentEnabledSetting(
            alias,
            if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        if (!on) return
        activity.runOnUiThread {
            if (Build.VERSION.SDK_INT >= 29) {
                val roles = activity.getSystemService(RoleManager::class.java)
                if (roles != null && roles.isRoleAvailable(RoleManager.ROLE_HOME) && !roles.isRoleHeld(RoleManager.ROLE_HOME)) {
                    @Suppress("DEPRECATION")
                    activity.startActivityForResult(roles.createRequestRoleIntent(RoleManager.ROLE_HOME), 7)
                }
            } else {
                activity.startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
            }
        }
    }

    fun shutdown() = tts.shutdown()

    /** siteWorks: is the website worth opening in our own viewer when the app is not installed? */
    private class Service(val site: String, val siteWorks: Boolean, vararg val packages: String)

    companion object {
        private const val TAG = "MerryMiles"
        /** Small facts this one tablet has been told from the Mac. */
        const val PREFS = "shell"
        const val HOME_OK = "home_ok"

        private val SERVICES = mapOf(
            "youtube" to Service("https://m.youtube.com/", true, "com.google.android.youtube"),
            "netflix" to Service("https://www.netflix.com/", false, "com.netflix.mediaclient"),
            "hulu" to Service("https://www.hulu.com/", false, "com.hulu.plus", "com.hulu.livingroomplus"),
            "music" to Service("https://open.spotify.com/", false, "com.spotify.music"),
            "spotify" to Service("https://open.spotify.com/", false, "com.spotify.music"),
        )
        /** Left off the ALL APPS page: Peloton's own parts and the chip makers' tools. */
        private val HIDDEN = listOf(
            "com.onepeloton", "com.peloton", "com.qualcomm", "com.qti", "com.mediatek",
            "com.android.webview", "com.google.android.webview",
        )
    }
}
