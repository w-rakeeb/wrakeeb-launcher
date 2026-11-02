# Privacy — Wrakeeb Launcher 0.4.0

The launcher has no account sign-in, analytics service or telemetry endpoint. Links, preferences, installation receipts and optional activity history are saved locally beside the launcher in data. WebView2 maintains a local browser profile. Turning off activity recording stops new history entries. Clear history removes current entries; previous library.json.bak files or your own backups can retain them.

Explicit update checks and release-information requests contact GitHub. Optional startup update checks and startup scans can be disabled in Settings. GitHub receives normal network request information, such as IP address and user agent; its policies apply. Metadata is cached. Downloads occur only after a download action, and installation and launch are separate actions.

Scan installed apps reads a bounded set of local application folders, selected uninstall-registry install locations and, optionally, Desktop/Downloads. It does not upload local paths or scan results. Scans identify expected file names and executable structure; they do not prove publisher authenticity. Locate lets you choose an individual app.

Opening a repository or external website uses your browser. Downloaded apps, Windows and WebView2 have their own network behavior and policies. The launcher does not alter those policies. No universal zero-network claim is made.

GitHub policy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
