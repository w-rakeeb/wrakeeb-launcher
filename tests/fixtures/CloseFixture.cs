using System;
using System.IO;
using System.Drawing;
using System.Windows.Forms;
public class CloseFixture : Form {
 int attempts=0;
 public CloseFixture() {
  Text="Wrakeeb Close QA fixture"; Size=new Size(420,180); StartPosition=FormStartPosition.Manual;
  foreach(Screen screen in Screen.AllScreens) if(!screen.Primary) { Location=new Point(screen.WorkingArea.X+60,screen.WorkingArea.Y+100); break; }
  Controls.Add(new Label {Dock=DockStyle.Fill,Text="Isolated close fixture. First close is cancelled; second close exits.",Padding=new Padding(20)});
  FormClosing+=(sender,args)=>{attempts++; if(attempts==1){args.Cancel=true;File.WriteAllText(Path.Combine(Environment.GetEnvironmentVariable("WRAKEEB_CLOSE_QA_ROOT"),"close-cancelled.txt"),"Save prompt cancellation preserved");}};
 }
 [STAThread] public static void Main(){Application.EnableVisualStyles();Application.Run(new CloseFixture());}
}
