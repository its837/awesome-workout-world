import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// One fixed key signs every build (see android/signing/README.md). A tablet only accepts
// an update signed with the same key as the copy it already has, so this key must never
// change once a real tablet has the app. Without the key file the build still works, signed
// with this computer's own throwaway key; tools/android.sh refuses to put that on a tablet.
val signingFile = rootProject.file("signing/signing.properties")
val signingProps = Properties().apply { if (signingFile.exists()) signingFile.inputStream().use { load(it) } }
if (!signingFile.exists()) logger.warn("No android/signing/signing.properties: this build is NOT signed with the family key.")

android {
    namespace = "com.merrymiles.app"
    compileSdk = 35

    signingConfigs {
        if (signingFile.exists()) create("family") {
            storeFile = rootProject.file("signing/" + signingProps.getProperty("storeFile"))
            storePassword = signingProps.getProperty("storePassword")
            keyAlias = signingProps.getProperty("keyAlias")
            keyPassword = signingProps.getProperty("keyPassword")
        }
    }
    buildTypes {
        getByName("debug") {
            signingConfigs.findByName("family")?.let { signingConfig = it }
        }
    }

    defaultConfig {
        applicationId = "com.merrymiles.app"
        minSdk = 24          // Android 7.0, the oldest Peloton tablets we might meet
        targetSdk = 33
        versionCode = 1
        versionName = "0.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // The game lives in ../web and is copied into the APK's assets at build time.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("webAssets"))
}

val copyWeb by tasks.registering(Copy::class) {
    from(rootProject.file("../web"))
    // Your own family, if you keep one in ../family (a folder that is left out of the
    // repository): it is laid over the made-up starter family that web/ holds.
    // AN APP BUILT ON YOUR MAC THEREFORE HAS YOUR FAMILY IN IT. Do not hand that file out.
    from(rootProject.file("../family")) { include("profiles.js", "tweaks.js", "family.js") }
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
    into(layout.buildDirectory.dir("webAssets/web"))
}
tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
