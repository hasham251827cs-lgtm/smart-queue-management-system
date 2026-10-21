SMART QUEUE - COMPLETE PROJECT

FILES
  Server.java      Java back end (REST API + JDBC + SQLite)
  index.html       Page skeleton (loads style.css and script.js)
  style.css        ALL colours and looks  (change the theme here)
  script.js        React code: every page and the logic
  ShowDB.java      Prints the database table in the command window
  sqlite-jdbc.jar  SQLite JDBC driver
  run.bat          Double-click to start the server (Windows)

RUN (any computer with JDK 11+)
  java -cp sqlite-jdbc.jar Server.java
  then open http://localhost:8080
  IMPORTANT: run it from INSIDE this folder (index.html is read from the current folder).

OPEN IN AN IDE
  VS Code / Cursor / Windsurf / Antigravity / Claude Code:
    File > Open Folder > this folder > open a terminal (Ctrl + `) > run the command above.
    (Install the "Extension Pack for Java" if you also want code help.)
  IntelliJ IDEA:
    Open the folder > File > Project Structure > Libraries > + > add sqlite-jdbc.jar
    > right-click Server.java > Run > Edit Configurations > Working directory = this folder.
  Eclipse:
    New Java Project > copy the files in > Build Path > Add External JAR > sqlite-jdbc.jar
    > Run As > Java Application; set the working directory to this folder.

CHANGE THE THEME  ->  open style.css
  The colours are in the first block, ":root { ... }" (top of the file).
  Edit a colour, save, then press Ctrl+F5 in the browser (no restart needed).
    --bg page background   --acc main colour   --amb highlight   --side sidebar colour   --card box colour
  PRESETS (replace the values in :root)
  Ocean blue   : --side:#0f1f3d; --side2:#1d3461; --bg:#eef2f9; --acc:#2563eb; --amb:#f59e0b
  Royal purple : --side:#2a1646; --side2:#3d2466; --bg:#f5f0fb; --acc:#7c3aed; --amb:#f59e0b
  Sunset orange: --side:#3b1d12; --side2:#58291a; --bg:#fbf3ec; --acc:#ea580c; --amb:#0ea5e9
  Forest green : --side:#0f2b1d; --side2:#1b4430; --bg:#eff6f0; --acc:#16a34a; --amb:#eab308
  Background image: in style.css find "body {" and use  background: url(pic.jpg) center / cover fixed;
  Font: in style.css find the "*" rule and change font-family.
