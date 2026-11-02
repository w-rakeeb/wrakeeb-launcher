using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

// A standalone .NET Framework 4.8 demonstration. No launcher dependency.
internal static class Program {
    [STAThread]
    private static void Main() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        var form = new Form {
            Text = "Wrakeeb Launcher Demo 1.0.0", ClientSize = new Size(640, 430),
            MinimumSize = new Size(560, 420), BackColor = Color.FromArgb(22,23,26),
            ForeColor = Color.FromArgb(242,243,245), Font = new Font("Segoe UI", 10),
            StartPosition = FormStartPosition.CenterScreen
        };
        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(28), ColumnCount = 1, RowCount = 7 };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 62));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        layout.Controls.Add(new Label { Text = "WRAKEEB  /  DEMONSTRATION", AutoSize = true, ForeColor = Color.FromArgb(181,186,193), Font = new Font("Segoe UI", 9) }, 0, 0);
        layout.Controls.Add(new Label { Text = "Installation complete", AutoSize = true, Font = new Font("Segoe UI", 21, FontStyle.Bold) }, 0, 1);
        layout.Controls.Add(new Label { Text = "This is a real, standalone sample application. You can close the launcher and keep using this window. No account or background service is required.", Dock = DockStyle.Fill, ForeColor = Color.FromArgb(181,186,193) }, 0, 2);
        layout.Controls.Add(new Label { Text = "Sample note", AutoSize = true }, 0, 3);
        var note = new TextBox { Multiline = true, Dock = DockStyle.Fill, Text = "Downloaded from GitHub. Installed on this PC. Ready to use.", BackColor = Color.FromArgb(30,32,36), ForeColor = form.ForeColor, BorderStyle = BorderStyle.FixedSingle, ScrollBars = ScrollBars.Vertical };
        layout.Controls.Add(note, 0, 4);
        var button = new Button { Text = "Save sample note", Width = 170, Height = 34, Margin = new Padding(0,12,0,0), BackColor = Color.FromArgb(64,85,214), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
        var status = new Label { Text = "Demo version 1.0.0  ·  No system settings changed", Dock = DockStyle.Fill, ForeColor = Color.FromArgb(181,186,193), Font = new Font("Segoe UI", 9) };
        button.Click += delegate {
            try {
                var directory = Environment.GetEnvironmentVariable("WRAKEEB_DEMO_DATA_ROOT") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Wrakeeb", "Launcher Demo");
                Directory.CreateDirectory(directory);
                File.WriteAllText(Path.Combine(directory, "sample-note.txt"), note.Text);
                status.Text = "Sample note saved locally.";
            } catch (Exception error) { status.Text = "Could not save: " + error.Message; }
        };
        layout.Controls.Add(button, 0, 5); layout.Controls.Add(status, 0, 6); form.Controls.Add(layout);
        if (Environment.GetEnvironmentVariable("WRAKEEB_TEST_MONITOR") == "secondary") {
            foreach (var screen in Screen.AllScreens) if (!screen.Primary) { form.StartPosition = FormStartPosition.Manual; form.Location = new Point(screen.WorkingArea.X + 30, screen.WorkingArea.Y + 60); break; }
        }
        Application.Run(form);
    }
}
