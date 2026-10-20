import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var nodeProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Start background Node server for RentLedger Desktop
        startNodeServer()

        let windowSize = NSSize(width: 1280, height: 860)
        let rect = NSRect(origin: .zero, size: windowSize)

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "RentLedger — Rental Accounting & Capex"
        window.isReleasedWhenClosed = false

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: rect, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self

        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Poll server until ready, then load
        pollAndLoadServer()
    }

    func pollAndLoadServer(attempt: Int = 0) {
        guard let url = URL(string: "http://127.0.0.1:3002/api/dashboard") else { return }
        var request = URLRequest(url: url)
        request.timeoutInterval = 0.5

        let task = URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    if let appURL = URL(string: "http://127.0.0.1:3002/") {
                        self?.webView.load(URLRequest(url: appURL))
                    }
                } else if attempt < 25 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        self?.pollAndLoadServer(attempt: attempt + 1)
                    }
                } else {
                    if let appURL = URL(string: "http://127.0.0.1:3002/") {
                        self?.webView.load(URLRequest(url: appURL))
                    }
                }
            }
        }
        task.resume()
    }

    func startNodeServer() {
        let fileManager = FileManager.default
        let bundleRes = Bundle.main.resourcePath ?? ""

        // Locate server.js
        let possibleDirs = [
            (bundleRes as NSString).appendingPathComponent("desktop"),
            bundleRes,
            (Bundle.main.bundleURL.deletingLastPathComponent().path as NSString).appendingPathComponent("desktop")
        ]

        var scriptPath = ""
        for dir in possibleDirs {
            let test = (dir as NSString).appendingPathComponent("server.js")
            if fileManager.fileExists(atPath: test) {
                scriptPath = test
                break
            }
        }

        guard !scriptPath.isEmpty else {
            NSLog("RentLedger: server.js not found in bundle resources")
            return
        }

        // Dynamically locate node executable without machine-specific hardcoding
        let candidatePaths = [
            (bundleRes as NSString).appendingPathComponent("node/bin/node"),
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        ]

        var nodeBin = ""
        for p in candidatePaths {
            if fileManager.isExecutableFile(atPath: p) {
                nodeBin = p
                break
            }
        }

        // Check PATH environment variable
        if nodeBin.isEmpty {
            let envPath = ProcessInfo.processInfo.environment["PATH"] ?? ""
            for segment in envPath.split(separator: ":") {
                let candidate = (String(segment) as NSString).appendingPathComponent("node")
                if fileManager.isExecutableFile(atPath: candidate) {
                    nodeBin = candidate
                    break
                }
            }
        }

        // Check NVM in current user's home directory
        if nodeBin.isEmpty {
            let home = NSHomeDirectory()
            let nvmDir = (home as NSString).appendingPathComponent(".nvm/versions/node")
            if let versions = try? fileManager.contentsOfDirectory(atPath: nvmDir) {
                for v in versions.sorted().reversed() {
                    let candidate = ((nvmDir as NSString).appendingPathComponent(v) as NSString).appendingPathComponent("bin/node")
                    if fileManager.isExecutableFile(atPath: candidate) {
                        nodeBin = candidate
                        break
                    }
                }
            }
        }

        guard !nodeBin.isEmpty else {
            NSLog("RentLedger: Node.js executable could not be found")
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodeBin)
        process.arguments = [scriptPath]
        process.currentDirectoryURL = URL(fileURLWithPath: (scriptPath as NSString).deletingLastPathComponent)

        var env = ProcessInfo.processInfo.environment
        env["PORT"] = "3002"
        process.environment = env

        try? process.run()
        self.nodeProcess = process
    }

    func applicationWillTerminate(_ notification: Notification) {
        nodeProcess?.terminate()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
