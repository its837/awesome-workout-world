package com.merrymiles.app

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.media.AudioManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * A plain full-screen web viewer for watching something (YouTube, Netflix, Hulu) when
 * the service's own app is not installed. Sign-ins persist between visits.
 * Only ever started by HostBridge with one of its fixed addresses.
 */
class WatchActivity : Activity() {
    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private var videoView: View? = null
    private var videoCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        root = FrameLayout(this)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        val home = Button(this).apply {
            text = "◀ Home"
            alpha = 0.8f
            setOnClickListener { finish() }
        }
        // quieter and louder, beside it: the tablet's own volume buttons are round the back
        val audio = getSystemService(AUDIO_SERVICE) as AudioManager
        val loudness = { text: String, direction: Int ->
            Button(this).apply {
                this.text = text
                alpha = 0.8f
                setOnClickListener { try { audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, AudioManager.FLAG_SHOW_UI) } catch (e: Exception) { /* not allowed: nothing to do */ } }
            }
        }
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(home)
            addView(loudness("  -  ", AudioManager.ADJUST_LOWER))
            addView(loudness("  +  ", AudioManager.ADJUST_RAISE))
        }
        root.addView(bar, FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT, Gravity.BOTTOM or Gravity.START).apply {
            setMargins(24, 24, 24, 24)
        })
        setContentView(root)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            loadWithOverviewMode = true
            useWideViewPort = true
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        // YouTube asks the browser which kinds of video it can play, then sends the newest
        // (VP9 or AV1). The bike's chip plays those in software and drops close to half the
        // picture; it plays the older kind (H.264) properly. So on YouTube's pages we answer
        // "no" to the new kinds, and YouTube sends H.264. (Measured by another project on
        // our bike's tablet: docs/tablets/WHAT_WORKS.md, A4.) The treadmill's chip is
        // unmeasured, and H.264 is safe everywhere, so both machines get it.
        //
        // Two ways in. Newer browser engines can add a script to a page before anything
        // else on it runs. Older ones (the bike may have one) cannot, so there we slip it in
        // as each page loads: see the client below.
        val hooked = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
        if (hooked) WebViewCompat.addDocumentStartJavaScript(web, H264_ONLY, YOUTUBE_ORIGINS)
        // a warning, so it survives on tablets that throw ordinary log lines away
        Log.w("MerryMiles", "viewer: H.264 script goes in " + (if (hooked) "before each page (engine hook)" else "as each page loads (older engine)"))

        web.webViewClient = object : WebViewClient() {   // links stay inside this viewer
            private var late = 0   // how many more times to offer the script to this page

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                if (!hooked && isYouTube(url)) { late = 40; view.evaluateJavascript(H264_ONLY, null) }
            }

            // Called for each file a page fetches. The first few arrive before YouTube's
            // player has started, which is when the script has to be there. The script
            // does nothing the second time, so offering it again is harmless.
            override fun onLoadResource(view: WebView, url: String?) {
                if (late > 0) { late--; view.evaluateJavascript(H264_ONLY, null) }
            }

            // no connection: say so, do not leave a blank page
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) view.loadDataWithBaseURL(null, OFFLINE, "text/html", "utf-8", null)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // full-screen video
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                videoView = view
                videoCallback = callback
                root.addView(view, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
                web.visibility = View.GONE
            }

            override fun onHideCustomView() {
                videoView?.let { root.removeView(it) }
                videoView = null
                web.visibility = View.VISIBLE
                videoCallback?.onCustomViewHidden()
                videoCallback = null
            }

            // copy-protected streams (Netflix, Hulu) ask for this; nothing else is granted
            override fun onPermissionRequest(request: PermissionRequest) {
                val wanted = request.resources.filter { it == PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID }.toTypedArray()
                if (wanted.isNotEmpty()) request.grant(wanted) else request.deny()
            }
        }
        web.loadUrl(intent.getStringExtra(EXTRA_URL) ?: "https://m.youtube.com/")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            videoView != null -> web.webChromeClient?.onHideCustomView()
            web.canGoBack() -> web.goBack()
            else -> finish()
        }
    }

    override fun onResume() { super.onResume(); web.onResume() }
    override fun onPause() { web.onPause(); super.onPause() }
    override fun onDestroy() { web.destroy(); super.onDestroy() }

    private fun isYouTube(url: String?): Boolean {
        val host = try { Uri.parse(url ?: return false).host ?: return false } catch (e: Exception) { return false }
        return YOUTUBE_HOSTS.any { host == it || host.endsWith(".$it") }
    }

    companion object {
        const val EXTRA_URL = "url"
        private val YOUTUBE_HOSTS = listOf("youtube.com", "youtube-nocookie.com")
        private val YOUTUBE_ORIGINS = setOf(
            "https://youtube.com", "https://*.youtube.com",
            "https://youtube-nocookie.com", "https://*.youtube-nocookie.com",
        )

        /**
         * Answers "cannot play that" for VP8, VP9 and AV1 in the three places a page can ask,
         * and leaves every other answer alone. Safe to run more than once on a page.
         */
        private val H264_ONLY = """
            (function () {
              if (window.__merryH264) return;
              window.__merryH264 = true;
              var not = /vp0?9|vp8|av01/i;
              var ms = window.MediaSource;
              if (ms && ms.isTypeSupported) {
                var ask = ms.isTypeSupported.bind(ms);
                ms.isTypeSupported = function (type) { return not.test(String(type)) ? false : ask(type); };
              }
              var media = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
              if (media && media.canPlayType) {
                var can = media.canPlayType;
                media.canPlayType = function (type) { return not.test(String(type)) ? '' : can.call(this, type); };
              }
              var caps = navigator.mediaCapabilities;
              if (caps && caps.decodingInfo) {
                var info = caps.decodingInfo.bind(caps);
                caps.decodingInfo = function (config) {
                  var type = config && config.video && config.video.contentType;
                  if (type && not.test(String(type))) return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
                  return info(config);
                };
              }
            })();
        """.trimIndent()
        private const val OFFLINE = "<html><body style='margin:0;background:#080e2e;color:#dfe9ff;font-family:sans-serif;" +
            "display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>" +
            "<div><h1 style='color:#ffd76a'>Can't reach this right now</h1>" +
            "<p style='font-size:22px'>Check the tablet's Wi-Fi, then use the Home button below to go back and try again.</p></div></body></html>"
    }
}
