import java.sql.*;

public class ShowDB {
    public static void main(String[] a) throws Exception {
        Connection c = DriverManager.getConnection("jdbc:sqlite:smartqueue.db");
        ResultSet r = c.createStatement().executeQuery(a.length > 0 ? a[0] : "SELECT id, name, service, priority, status, created FROM tickets");
        ResultSetMetaData m = r.getMetaData();
        int n = m.getColumnCount();
        for (int i = 1; i <= n; i++) System.out.printf("%-20s", m.getColumnName(i).toUpperCase());
        System.out.println("\n" + "-".repeat(20 * n));
        while (r.next()) {
            for (int i = 1; i <= n; i++) System.out.printf("%-20s", r.getString(i));
            System.out.println();
        }
    }
}
