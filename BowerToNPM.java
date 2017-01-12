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

    private static void convert(Path polymerPath, Path wcPath, Path oldPolymerPath, Path oldWcPath, Path directory) {
        class BowerToNPMConverter {

            private Path polymerPath;
            private Path wcPath;
            private Path oldPolymerPath;
            private Path oldWcPath;

            BowerToNPMConverter(Path polymerPath, Path wcPath, Path oldPolymerPath, Path oldWcPath, Path directory) {
                this.polymerPath = polymerPath;
                this.wcPath = wcPath;
                this.oldPolymerPath = oldPolymerPath;
                this.oldWcPath = oldWcPath;

                rewriteFiles(directory);
            }

            private void rewriteFiles(Path directory) {
                // TODO(namchi): Get files in directory and change path names
                ArrayDeque<String> files = filesToRewrite(directory.toFile());
            }

            private ArrayDeque<String> filesToRewrite(File directory) {
                ArrayDeque<String> files = new ArrayDeque<String>();

                String path = "";
                if(!directory.isDirectory() && (path = directory.getAbsolutePath()).endsWith(".html")) {
                    files.add(path);
                } else {
                    for(File f: directory.listFiles()) {
                        if(f.isFile() && (path = f.getAbsolutePath()).endsWith(".html")) {
                            files.add(path);
                        } else if(f.isDirectory()) {
                            files.addAll(filesToRewrite(f));
                        }
                    }
                }

                return files;
            }
        }
        BowerToNPMConverter converter = new BowerToNPMConverter(polymerPath, wcPath, oldPolymerPath, oldWcPath, directory);
    }

    private static Path checkPath(String path) {
        if(!new File(path).exists()) {
            System.err.println("Invalid path: " + path);
            System.exit(1);
        }
        
        return Paths.get(path);
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String input = "";

        // node_modules/@polymer/polymer/polymer.html
        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "NEW Polymer file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path polymerPath = checkPath(input);

        // node_modules/@polymer/polymer/node_modules/webcomponents.js/webcomponents-lite.js
        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "NEW webcomponents.js file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path wcPath = checkPath(input);

        // bower_components/polymer/polymer.html
        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "OLD Polymer file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path oldPolymerPath = checkPath(input);

        // bower_components/webcomponentsjs/webcomponents-lite.js
        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "OLD webcomponents.js file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path oldWcPath = checkPath(input);

        // bower_components/
        System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "directory or file to convert: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path directory = checkPath(input);

        convert(polymerPath, wcPath, oldPolymerPath, oldWcPath, directory);
    }

}