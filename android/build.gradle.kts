plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}

// This project lives in a Google Drive folder. Build output is thousands of small files,
// so it goes to a local cache folder instead of being synced.
// MERRY_OUT moves it, for trying a change without disturbing the build that is ready to install.
val outRoot = File(System.getenv("MERRY_OUT") ?: (System.getProperty("user.home") + "/Library/Caches/MerryMiles"), "build")
allprojects {
    layout.buildDirectory.set(File(outRoot, project.name))
}
