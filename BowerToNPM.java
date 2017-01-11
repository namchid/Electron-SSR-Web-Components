import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.StringBuilder;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayDeque;
import java.util.Scanner;

public class BowerToNPM {

    private static final String BLUE = "\u001B[34m";
    private static final String BOLD = "\033[0;1m";
    private static final String GREEN = "\u001B[32m";
    private static final String RESET = "\033[0;0m";


    private static Path checkPath(String path) {
        if(!new File(path).exists()) {
            System.err.println("Invalid path: " + path);
            System.exit(1);
        }
        
        return Paths.get(path);
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);

        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "new Polymer directory: " + RESET + GREEN);
        String polymerDir = in.next();
        System.out.print(RESET);
        Path polymerPath = checkPath(polymerDir);

        // System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "directory or file to convert" + RESET + BLUE + ": " + RESET + GREEN);
        // String otherDir = in.next();
        // System.out.print(RESET);
        // Path otherPath = checkPath(otherDir);

        // System.out.println(otherPath.relativize(polymerPath));
        //System.out.println(new File(bowerDir).toURI().relativize(new File(otherDir).toURI()).getPath());
    }

}