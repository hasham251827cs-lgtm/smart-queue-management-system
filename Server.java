import com.sun.net.httpserver.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class Server {
    static Connection db;

    public static void main(String[] args) throws Exception {
        db = DriverManager.getConnection("jdbc:sqlite:smartqueue.db");
        db.createStatement().execute("CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, service TEXT, priority TEXT, slot TEXT, status TEXT, created TEXT)");
        ResultSet c = db.createStatement().executeQuery("SELECT COUNT(*) FROM tickets");
        if (c.getInt(1) == 0) seed();
        HttpServer s = HttpServer.create(new InetSocketAddress(8080), 0);
        // Serve the website files: index.html, style.css and script.js
        s.createContext("/", x -> {
            String file = x.getRequestURI().getPath().equals("/") ? "index.html" : x.getRequestURI().getPath().substring(1);
            if (!List.of("index.html", "style.css", "script.js").contains(file)) { x.sendResponseHeaders(404, -1); x.close(); return; }
            String type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html";
            send(x, type, Files.readAllBytes(Path.of(file)));
        });
        s.createContext("/api/", x -> {
            try { send(x, "application/json", handle(x).getBytes(StandardCharsets.UTF_8)); }
            catch (Exception e) { e.printStackTrace(); send(x, "application/json", "[]".getBytes()); }
        });
        s.start();
        System.out.println("Smart Queue running -> http://localhost:8080");
    }

    static synchronized String handle(HttpExchange x) throws Exception {
        String path = x.getRequestURI().getPath();
        if (x.getRequestMethod().equals("POST")) {
            Map<String, String> p = form(x);
            switch (path) {
                case "/api/add" -> exec("INSERT INTO tickets(name,phone,service,priority,slot,status,created) VALUES(?,?,?,?,?,'waiting',?)",
                    p.get("name"), p.get("phone"), p.get("service"), p.get("priority"), p.get("slot"), LocalDateTime.now().withNano(0).toString());
                case "/api/next" -> {
                    exec("UPDATE tickets SET status='done' WHERE status='serving'");
                    exec("UPDATE tickets SET status='serving' WHERE id=(SELECT id FROM tickets WHERE status='waiting' ORDER BY CASE priority WHEN 'Emergency' THEN 0 WHEN 'Senior' THEN 1 ELSE 2 END, id LIMIT 1)");
                }
                case "/api/reset" -> { exec("DELETE FROM tickets"); exec("DELETE FROM sqlite_sequence WHERE name='tickets'"); seed(); }
                default -> exec("UPDATE tickets SET status=? WHERE id=?", p.get("status"), p.get("id"));
            }
            return "[]";
        }
        ResultSet r = db.createStatement().executeQuery("SELECT * FROM tickets WHERE status!='cancelled' ORDER BY id");
        StringBuilder sb = new StringBuilder("[");
        while (r.next()) {
            if (sb.length() > 1) sb.append(",");
            sb.append(String.format("{\"id\":%d,\"name\":\"%s\",\"phone\":\"%s\",\"service\":\"%s\",\"priority\":\"%s\",\"slot\":\"%s\",\"status\":\"%s\",\"created\":\"%s\"}",
                r.getInt("id"), esc(r.getString("name")), esc(r.getString("phone")), esc(r.getString("service")),
                esc(r.getString("priority")), esc(r.getString("slot")), r.getString("status"), esc(r.getString("created"))));
        }
        return sb.append("]").toString();
    }

    static void seed() throws Exception {
        String[][] d = {
            {"Rahul Mehta","98200 11122","General Checkup","Normal","","done","120"},
            {"Priya Nair","99877 40321","Lab Tests","Normal","","done","105"},
            {"Imran Sheikh","98190 77654","Billing","Normal","","done","90"},
            {"Sneha Kulkarni","97020 55810","Consultation","Senior","","done","80"},
            {"Arjun Deshmukh","98339 20456","General Checkup","Normal","","serving","60"},
            {"Fatima Khan","99600 31877","Consultation","Emergency","","waiting","20"},
            {"Meera Iyer","98674 90213","General Checkup","Senior","","waiting","45"},
            {"Vikram Patil","97730 66548","Lab Tests","Normal","30","waiting","40"},
            {"Rohan Joshi","98920 14375","Documentation","Normal","","waiting","30"},
            {"Ananya Gupta","99304 82190","Billing","Normal","60","waiting","25"},
            {"Kabir Singh","98211 47653","Consultation","Normal","90","waiting","15"},
            {"Neha Verma","97690 23087","Lab Tests","Normal","120","waiting","10"},
            {"Sanjay Rao","98450 61932","Documentation","Senior","","waiting","5"}};
        for (String[] a : d) {
            String slot = a[4].isEmpty() ? "" : LocalDateTime.now().plusMinutes(Long.parseLong(a[4])).truncatedTo(ChronoUnit.MINUTES).toString();
            exec("INSERT INTO tickets(name,phone,service,priority,slot,status,created) VALUES(?,?,?,?,?,?,?)",
                a[0], a[1], a[2], a[3], slot, a[5], LocalDateTime.now().minusMinutes(Long.parseLong(a[6])).withNano(0).toString());
        }
    }

    static void exec(String sql, String... a) throws Exception {
        PreparedStatement ps = db.prepareStatement(sql);
        for (int i = 0; i < a.length; i++) ps.setString(i + 1, a[i]);
        ps.executeUpdate();
    }

    static String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\""); }

    static Map<String, String> form(HttpExchange x) throws Exception {
        Map<String, String> m = new HashMap<>();
        for (String p : new String(x.getRequestBody().readAllBytes(), StandardCharsets.UTF_8).split("&")) {
            String[] kv = p.split("=", 2);
            if (kv.length == 2) m.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
        }
        return m;
    }

    static void send(HttpExchange x, String type, byte[] b) throws java.io.IOException {
        x.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        x.sendResponseHeaders(200, b.length);
        x.getResponseBody().write(b);
        x.close();
    }
}
