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
    private static final String RED = "\u001B[31m";
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
                try {
                    ArrayDeque<String> files = filesToRewrite(directory.toFile());

                    BufferedReader reader = null;
                    BufferedWriter writer = null;

                    for(String f: files) {
                        // Note: Must call .getParent() because we want to see the relationship between the
                        // current file's enclosing folder and the old files

                        // Relative path from this file to new Polymer file
                        String relativePolymerPath = Paths.get(f).getParent().relativize(polymerPath).toString();
                        // Relative path from this file to new webcomponents file
                        String relativeWcPath = Paths.get(f).getParent().relativize(wcPath).toString();
                        // Relative path from this file to old Polymer file
                        String relativeOldPolymerPath = Paths.get(f).getParent().relativize(oldPolymerPath).toString();
                        // Relative path from this file to old webcomponents file
                        String relativeOldWcPath = Paths.get(f).getParent().relativize(oldWcPath).toString();

                        reader = new BufferedReader(new FileReader(f));
                        StringBuilder sb = new StringBuilder();
                        String line = "";

                        System.out.println(relativePolymerPath + "\t" + relativeOldPolymerPath);
                        
                        while((line = reader.readLine()) != null) {
                            line = line.replaceAll(relativeOldPolymerPath, relativePolymerPath);
                            line = line.replaceAll(relativeOldWcPath, relativeWcPath);
                            sb.append(line + "\n");
                        }

                        reader.close();
                        writer = new BufferedWriter(new FileWriter(f));
                        writer.write(sb.toString());
                        writer.close();
                    }

                    if(writer != null) writer.close();
                    if(reader != null) reader.close();
                } catch(Exception e) {
                    System.err.println("Whoopsie. Something went wrong.");
                    e.printStackTrace();
                    System.exit(1);
                }
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

    // Note: This must return an absolute path
    private static Path checkPath(String path) {
        if(!new File(path).exists()) {
            // Assumes that even though the path is invalid,
            // the user knows which relative directory path gshould be.
            System.out.println(RED + "WARNING: " + RESET + "Invalid path: " + path + " , continuing anyway.");
        }
        
        return Paths.get(new File(path).getAbsolutePath());
    }

    public static void main(String[] args) {
        // silent
        boolean silentMode = false;
        if(args.length > 0) {
            if(args[0].equals("-s")) {
                silentMode = true;
            }
        }

        Scanner in = new Scanner(System.in);
        String input = "";

        // node_modules/@polymer/polymer/polymer.html
        if(!silentMode) System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "NEW Polymer file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path polymerPath = checkPath(input);

        // node_modules/@polymer/polymer/node_modules/webcomponents.js/webcomponents-lite.js
        if(!silentMode) System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "NEW webcomponents.js file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path wcPath = checkPath(input);

        // bower_components/polymer/polymer.html
        if(!silentMode)System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "OLD Polymer file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path oldPolymerPath = checkPath(input);

        // bower_components/webcomponentsjs/webcomponents-lite.js
        if(!silentMode) System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "OLD webcomponents.js file: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path oldWcPath = checkPath(input);

        // bower_components/
        if(!silentMode) System.out.print(RESET + BLUE + "Path to " + RESET + BOLD + "directory or file to convert: " + RESET + GREEN);
        input = in.next();
        System.out.print(RESET);
        Path directory = checkPath(input);

        convert(polymerPath, wcPath, oldPolymerPath, oldWcPath, directory);
    }

}