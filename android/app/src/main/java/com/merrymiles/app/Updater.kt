package com.merrymiles.app

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * Over-the-air updates for the game (the contents of /web), without reinstalling the app.
 *
 * The game is a "bundle": a folder of files plus bundle.json, which lists every file with
 * its SHA-256 and carries a build number. One copy ships inside the APK. This class can
 * fetch a newer bundle from a web address, check every file against its hash, and switch
 * to it on the next start.
 *
 * Safety net: a freshly downloaded bundle is on probation. The game must call
 * MerryHost.bundleReady() once it is up; if it never does (a broken update), the next
 * start (or 30 seconds, whichever comes first) throws that bundle away and goes back to
 * the version that was running before it.
 */
class Updater(private val context: Context, private val report: (state: String, message: String, version: String) -> Unit) {
    private val root = File(context.filesDir, "bundles")
    private val prefs = context.getSharedPreferences("updates", Context.MODE_PRIVATE)
    private val worker = Executors.newSingleThreadExecutor()

    private val bundled: JSONObject = try {
        JSONObject(context.assets.open("$ASSET_DIR/bundle.json").bufferedReader().use { it.readText() })
    } catch (e: Exception) {
        JSONObject().put("build", 0).put("version", "?")
    }
    val bundledBuild: Long get() = bundled.optLong("build", 0)

    /** Where updates come from. Set once with: am start ... --es update_url http://host:port */
    var url: String
        get() = prefs.getString("url", DEFAULT_URL) ?: DEFAULT_URL
        set(value) { prefs.edit().putString("url", value.trimEnd('/')).apply() }

    /** The downloaded bundle currently in use, or null when running the copy inside the APK. */
    fun activeDir(): File? {
        val name = prefs.getString("active", null) ?: return null
        val dir = File(root, name)
        val build = name.toLongOrNull() ?: 0
        // an APK update that already contains something newer wins
        return if (dir.isDirectory && build > bundledBuild) dir else null
    }

    private fun manifestOf(dir: File?): JSONObject =
        if (dir == null) bundled else try { JSONObject(File(dir, "bundle.json").readText()) } catch (e: Exception) { bundled }

    fun activeManifest(): JSONObject = manifestOf(activeDir())
    val onProbation: Boolean get() = activeDir() != null && prefs.getBoolean("probation", false)

    /** Open a game file for the WebView: from the active download if there is one, else from the APK. */
    fun open(path: String): InputStream? {
        if (path.contains("..")) return null
        val dir = activeDir()
        return try {
            if (dir != null) File(dir, path).takeIf { it.isFile && it.canonicalPath.startsWith(dir.canonicalPath) }?.inputStream()
            else context.assets.open("$ASSET_DIR/$path")
        } catch (e: Exception) {
            null
        }
    }

    /** Called on start-up, before loading the game: drop a bundle that never proved itself. */
    fun rejectIfUnproven(): Boolean {
        if (!onProbation) return false
        // go back to the version that was running before, or the copy inside the APK
        val previous = prefs.getString("previous", null)?.takeIf { File(root, it).isDirectory }
        val bad = prefs.getString("active", "?") ?: "?"
        Log.w(TAG, "update $bad never reported ready; going back to ${previous ?: "the built-in copy"}")
        File(root, bad).deleteRecursively()
        prefs.edit().apply {
            putStringSet("rejected", (prefs.getStringSet("rejected", emptySet()) ?: emptySet()) + bad)   // never offer that build again
            if (previous != null) putString("active", previous) else remove("active")
            remove("previous").putBoolean("probation", false)
        }.apply()
        return true
    }

    /** The game calls this (via MerryHost.bundleReady) once it is running. */
    fun confirm() { if (prefs.getBoolean("probation", false)) prefs.edit().putBoolean("probation", false).apply() }

    /** Switch to the downloaded bundle. The caller then reloads the WebView. */
    fun apply(): Boolean {
        val pending = prefs.getString("pending", null) ?: return false
        if (!File(root, pending).isDirectory) return false
        prefs.edit().apply {
            prefs.getString("active", null)?.let { putString("previous", it) }
            putString("active", pending).remove("pending").putBoolean("probation", true)
        }.apply()
        return true
    }

    fun check() {
        worker.execute {
            try { download() } catch (e: Exception) {
                Log.w(TAG, "update check failed", e)
                report("error", "COULD NOT REACH THE UPDATE ADDRESS", "")
            }
        }
    }

    private fun download() {
        val base = url
        if (base.isEmpty()) { report("error", "NO UPDATE ADDRESS HAS BEEN SET", ""); return }
        report("checking", "LOOKING FOR A NEWER VERSION...", "")
        val remote = JSONObject(String(fetch("$base/bundle.json")))
        val build = remote.getLong("build")
        val version = remote.optString("version", "?")
        val current = activeManifest()
        if (build <= current.optLong("build", 0)) { report("none", "YOU HAVE THE LATEST VERSION", current.optString("version", "")); return }
        if (prefs.getStringSet("rejected", emptySet())?.contains(build.toString()) == true) {
            report("none", "THE NEWEST UPDATE DID NOT WORK HERE - WAITING FOR A FIX", current.optString("version", ""))
            return
        }

        // files we already have (same hash) are copied, not downloaded again
        val have = HashMap<String, String>()
        current.optJSONArray("files")?.let { for (i in 0 until it.length()) it.getJSONObject(i).let { f -> have[f.getString("path")] = f.getString("sha256") } }
        val files = remote.getJSONArray("files")
        val part = File(root, "$build.part").apply { deleteRecursively(); mkdirs() }
        for (i in 0 until files.length()) {
            val f = files.getJSONObject(i)
            val path = f.getString("path")
            val want = f.getString("sha256")
            require(!path.contains("..") && !path.startsWith("/")) { "bad path in manifest: $path" }
            report("downloading", "DOWNLOADING ${i + 1} OF ${files.length()}", version)
            val bytes = (if (have[path] == want) open(path)?.use { it.readBytes() } else null) ?: fetch("$base/$path")
            require(sha256(bytes) == want) { "hash mismatch for $path" }
            File(part, path).apply { parentFile?.mkdirs(); writeBytes(bytes) }
        }
        File(part, "bundle.json").writeText(remote.toString())
        val done = File(root, build.toString()).apply { deleteRecursively() }
        require(part.renameTo(done)) { "could not move the download into place" }
        prefs.edit().putString("pending", build.toString()).apply()
        // tidy up older downloads (keep the one in use and the new one)
        val keep = setOf(build.toString(), prefs.getString("active", null), prefs.getString("previous", null))
        root.listFiles()?.forEach { if (it.name !in keep) it.deleteRecursively() }
        report("ready", "VERSION $version IS READY", version)
    }

    private fun fetch(address: String): ByteArray {
        val c = URL(address).openConnection() as HttpURLConnection
        c.connectTimeout = 8000
        c.readTimeout = 15000
        c.useCaches = false
        try {
            require(c.responseCode == 200) { "HTTP ${c.responseCode} for $address" }
            return c.inputStream.use { it.readBytes() }
        } finally {
            c.disconnect()
        }
    }

    private fun sha256(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    companion object {
        /** Rescue: drop every downloaded game version and go back to the copy inside the APK. */
        fun forgetDownloads(context: Context) {
            context.getSharedPreferences("updates", Context.MODE_PRIVATE).edit()
                .remove("active").remove("pending").remove("previous").putBoolean("probation", false).apply()
            File(context.filesDir, "bundles").deleteRecursively()
        }

        const val TAG = "MerryUpdater"
        const val ASSET_DIR = "web"
        /** Empty until we pick somewhere to host updates; set per tablet with --es update_url for now. */
        const val DEFAULT_URL = ""
    }
}
