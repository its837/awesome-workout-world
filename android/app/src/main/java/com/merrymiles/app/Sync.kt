package com.merrymiles.app

import android.content.Context
import android.util.Base64
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Keeps the family's log of rides in step between the machines (the bike and the
 * treadmill), through a private GitHub repository that holds nothing else.
 *
 * Each machine writes ONE file of its own there, logs/<machine>.json, holding every ride
 * and every opened door it knows about, and reads the other machines' files. The game then
 * adds whatever it had not seen. Rides are only ever added, never changed, so two machines
 * can never overwrite each other: the worst a failure can do is leave one of them behind
 * until the next try.
 *
 * It needs a key that can read and write that one repository. The key is typed by the
 * owner into a command on the Mac (tools/android.sh sync-key), which puts it in this app's
 * private storage. It is never in the code, in the public game, or in the log.
 */
class Sync(context: Context, private val machine: String, private val tellGame: (String, JSONObject) -> Unit) {
    private val worker = Executors.newSingleThreadExecutor()
    private val where = File(context.filesDir, "sync.json")     // { "repo": "owner/name", "key": "..." }
    private val notes = context.getSharedPreferences("sync", Context.MODE_PRIVATE)
    @Volatile private var busy = false

    private class Place(val api: String, val repo: String, val key: String)
    private class Answer(val code: Int, val body: String)

    private fun place(): Place? = try {
        val j = JSONObject(where.readText())
        val repo = j.optString("repo")
        val key = j.optString("key")
        // "api" is only ever set by the test on the emulator, to point at a stand-in on the Mac
        if (repo.isBlank() || key.isBlank()) null else Place(j.optString("api", "https://api.github.com").trimEnd('/'), repo, key)
    } catch (e: Exception) {
        null
    }

    /** { on, machine, last (clock time of the last good sync, or 0), message } */
    fun status(): JSONObject = JSONObject()
        .put("on", place() != null)
        .put("machine", machine)
        .put("last", notes.getLong("last", 0))
        .put("message", notes.getString("message", "") ?: "")

    /** save: the game's whole save, as text. The answer arrives at the page as MerryMiles.onSync(...). */
    fun run(save: String) {
        val p = place()
        if (p == null) { tellGame("onSync", JSONObject().put("state", "off")); return }
        if (busy) return
        busy = true
        worker.execute {
            val result = JSONObject()
            try {
                val mine = JSONObject(save)
                val log = JSONObject()
                    .put("machine", machine)
                    .put("rides", mine.optJSONArray("rides") ?: JSONArray())
                    .put("opens", mine.optJSONArray("opens") ?: JSONArray())
                val text = log.toString()

                // 1. what the other machines have put there
                val others = JSONArray()
                var mine_sha: String? = null
                val listing = ask(p, "GET", "contents/logs", null, false)
                if (listing.code == 200) {
                    val files = JSONArray(listing.body)
                    for (i in 0 until files.length()) {
                        val f = files.getJSONObject(i)
                        val name = f.optString("name")
                        if (!NAME.matches(name)) continue
                        if (name == "$machine.json") { mine_sha = f.optString("sha"); continue }
                        val got = ask(p, "GET", "contents/logs/$name", null, true)
                        if (got.code == 200) try { others.put(JSONObject(got.body)) } catch (e: Exception) { /* not a log: skip it */ }
                    }
                } else if (listing.code != 404) {          // 404: nothing there yet, which is fine
                    throw IOException(refusal(listing.code))
                }

                // 2. ours, if it has changed since we last sent it
                val mark = "${text.length}:${text.hashCode()}"
                var sent = false
                if (mine_sha == null || notes.getString("sent", "") != mark) {
                    val body = JSONObject()
                        .put("message", "$machine: ${log.getJSONArray("rides").length()} rides")
                        .put("content", Base64.encodeToString(text.toByteArray(Charsets.UTF_8), Base64.NO_WRAP))
                    if (mine_sha != null) body.put("sha", mine_sha)
                    val put = ask(p, "PUT", "contents/logs/$machine.json", body.toString(), false)
                    if (put.code != 200 && put.code != 201) throw IOException(refusal(put.code))
                    notes.edit().putString("sent", mark).apply()
                    sent = true
                }

                notes.edit().putLong("last", System.currentTimeMillis()).putString("message", "").apply()
                result.put("state", "ok").put("others", others).put("sent", sent)
                Log.w(TAG, "sync: ok. ${others.length()} other machine(s) read; our log ${if (sent) "sent" else "already up to date"}")
            } catch (e: Exception) {
                val message = (e.message ?: "COULD NOT REACH GITHUB").take(60).uppercase()
                notes.edit().putString("message", message).apply()
                result.put("state", "error").put("message", message)
                Log.w(TAG, "sync: failed: ${e.javaClass.simpleName}: ${e.message}")
            }
            busy = false
            tellGame("onSync", result)
        }
    }

    private fun refusal(code: Int) = when (code) {
        401 -> "THE KEY WAS REFUSED"
        403 -> "THE KEY MAY NOT DO THAT"
        404 -> "THE LOG REPOSITORY WAS NOT FOUND"
        409, 422 -> "GITHUB WAS BUSY: IT WILL TRY AGAIN"
        else -> "GITHUB ANSWERED $code"
    }

    private fun ask(p: Place, method: String, path: String, body: String?, raw: Boolean): Answer {
        val c = URL("${p.api}/repos/${p.repo}/$path").openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 8000
            c.readTimeout = 12000
            c.setRequestProperty("Authorization", "Bearer ${p.key}")
            c.setRequestProperty("Accept", if (raw) "application/vnd.github.raw+json" else "application/vnd.github+json")
            c.setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
            c.setRequestProperty("User-Agent", "awesome-workout-world")
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = c.responseCode
            val stream = if (code in 200..299) c.inputStream else c.errorStream
            return Answer(code, stream?.bufferedReader()?.use { it.readText() } ?: "")
        } finally {
            c.disconnect()
        }
    }

    private companion object {
        const val TAG = "MerryMiles"
        val NAME = Regex("^[a-z0-9-]{1,40}\\.json$")
    }
}
