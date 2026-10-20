import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var nodeProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Start background Node server for RentLedger static web files
        startNodeServer()

        let windowSize = NSSize(width: 1200, height: 820)
        let rect = NSRect(origin: .zero, size: windowSize)

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "RentLedger"
        window.isReleasedWhenClosed = false

        let config = WKWebViewConfiguration()
        // Enable local storage, indexedDB, WebAssembly
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: rect, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self

        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // Give server 500ms to be fully ready, then load
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let url = URL(string: "http://127.0.0.1:4321/") {
                self.webView.load(URLRequest(url: url))
            }
        }
    }

    func startNodeServer() {
        // Find node executable
        let fileManager = FileManager.default
        let possibleDirs = [
            "/Users/adityaupadhyay/myplayarea/rent-ledger",
            Bundle.main.resourcePath ?? ""
        ]

        var scriptPath = ""
        for dir in possibleDirs {
            let test = (dir as NSString).appendingPathComponent("serve.js")
            if fileManager.fileExists(atPath: test) {
                scriptPath = test
                break
            }
        }

        guard !scriptPath.isEmpty else { return }

        let nodePaths = ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/Users/adityaupadhyay/.nvm/versions/node/v24.7.0/bin/node"]
        var nodeBin = "node"
        for p in nodePaths {
            if fileManager.fileExists(atPath: p) {
                nodeBin = p
                break
            }
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodeBin)
        process.arguments = [scriptPath]
        process.currentDirectoryURL = URL(fileURLWithPath: (scriptPath as NSString).deletingLastPathComponent)
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
