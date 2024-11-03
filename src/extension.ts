import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('pathy.generateApiPath', async () => {
        // Get active text editor
        const editor = vscode.window.activeTextEditor;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        let selectedPath = '';
        if (editor) {
            // If an editor is active, get the selected file's path
            selectedPath = editor.document.fileName;
        }

        // Create webview to display API path
        createWebviewPanel(selectedPath,workspaceFolder);
    });

    context.subscriptions.push(disposable);
}

function createWebviewPanel(initialFilePath: string, workspaceFolder: string) {
    const panel = vscode.window.createWebviewPanel(
        'apiPathGenerator',
        'Generated API Path',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    const projectStructure = getProjectStructure(workspaceFolder);
    panel.webview.html = getWebviewContent(initialFilePath, projectStructure);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
        console.log("Message received from webview: ", message); 
        switch (message.command) {
            case 'generateFromInput':
                const inputPath = message.filePath;
                const apiPath = inputPath.replace(/\\/g, '/');
                panel.webview.postMessage({ command: 'updateApiPath', apiPath });
                break;
            
            case 'validateJSON':
                console.log("JSON sent!!!");
                const jsonInput = message.JSON_Object;
                let isValidJSON = true;
                let errorMessage = "";

                try {
                    JSON.parse(jsonInput);
                } catch (error) {
                    isValidJSON = false; // Set to false if JSON is invalid
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else {
                        errorMessage = "Unknown error occurred"; 
                    }
                }

                // Send the validation result back to the webview
                console.log("JSON Validator Result!");
                panel.webview.postMessage({ 
                    command: 'jsonValidationResult', 
                    isValid: isValidJSON, 
                    errorMessage: errorMessage 
                });
                break;


        }
    });
}
function getProjectStructure(dir: string): any {
    const result: any = {};
    if (!dir) {
        vscode.window.showErrorMessage("Workspace folder is missing.");
        return result;
    }

    function readDirectory(directory: string, obj: any) {
        try {
            const items = fs.readdirSync(directory, { withFileTypes: true });
            items.forEach((item) => {
                const fullPath = path.join(directory, item.name);
                if (item.isDirectory()) {
                    obj[item.name] = {};
                    readDirectory(fullPath, obj[item.name]);
                } else {
                    obj[item.name] = 'file';
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            vscode.window.showErrorMessage(`Error reading directory: ${errorMessage}`);
        }

    }

    readDirectory(dir, result);
    return result;
}


function getWebviewContent(initialFilePath: string, projectStructure: any): string {
    const projectStructureJSON = JSON.stringify(projectStructure, null, 2);
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pathy</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #1e1e1e; /* Dark background */
                color: #d4d4d4; /* Light text color */
                padding: 20px;
                display: flex;
                justify-content: center;
            }
            .container {
                width: 100%;
                max-width: 700px;
                background-color: #252526; /* Darker container */
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            }
            h1 {
                font-size: 24px;
                color: #9cdcfe; /* Light blue header */
                text-align: center;
                margin-bottom: 30px;
            }
            h2 {
                font-size: 18px;
                color: #dcdcaa; /* Light yellow sub-headers */
                margin-bottom: 10px;
                display: flex;
                align-items: center;
            }
            h4 {
                font-size: 11px;
                color: #aaaaaa; /* Slightly gray color */
                margin-top: 10px;
                display: flex;
                text-align: center;
            }
            input, textarea {
                width: 100%;
                padding: 10px;
                margin-bottom: 15px;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                font-size: 14px;
                background-color: #333333;
                color: #d4d4d4;
            }
            textarea {
                height: 80px;
                resize: none;
            }
            .apiPathOutput{
                height: 20px;
                margin-right: 10px;
            }
            button {
                display: inline-block;
                padding: 10px 15px;
                background-color: #007ACC; /* VS Code Blue */
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            button:hover {
                background-color: #005a9e;
            }
            .icon {
                width: 24px;
                height: 24px;
                margin-right: 8px;
                fill: #d4d4d4;
            }
            .file-select {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .file-select button {
                width: auto;
                background-color: #007ACC;
                margin-left: 10px;
            }
            button:focus, input:focus, textarea:focus {
                outline: none;
                border-color: #007ACC;
            }
            label {
                font-size: 14px;
                font-weight: bold;
                color: #dcdcaa;
            }
            .copy-notification {
                display: none;
                color: lightgreen;
                font-weight: bold;
                margin-top: 10px;
                text-align: center;
            }
            .section {
                border-bottom: 1px solid #333333;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }
            .api-path-section {
                margin-top: 20px;
                display: flex;
                align-items: center; /* Center items vertically */
            }
            .copy-button {
                background-color: #f39c12;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 50px; /* Fixed width for copy button */
                height: 40px; /* Match textarea height */
                cursor: pointer;
                border: none; /* Remove border */
                border-radius: 4px; /* Rounded corners */
                margin-top: -15px;
            }
            .copy-button:hover {
                background-color: #e67e22;
            }
            .hidden {
                display: none;
            }
            .success-message {
                color: #00ff00; /* Green color for success message */
                font-weight: bold;
                margin-top: 15px;
                text-align: center;
                padding: 10px;
                border: 2px solid #00ff00; /* Border for visibility */
                background-color: rgba(0, 255, 0, 0.1); /* Light green background */
                border-radius: 4px;
                display: none; /* Hidden by default */
            }
            .error-message {
                color: red;
                font-weight: bold;
                margin-top: 10px;
                padding: 10px;
                border: 2px solid red; /* Border for visibility */
                background-color: rgba(255, 0, 0, 0.1); /* Light red background */
                border-radius: 4px;
                display: none; /* Hidden by default */
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Pathy</h1>
            <div class="section">
                <h2><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-1 14.5h2v-6h-2v6zm0-8h2V7h-2v2.5z"/></svg> Convert Path to API Path</h2>
                <h4>Example 'src\\api\\api-path' => 'src/api/api/path'</h4>
                <input type="text" id="filePathInput" value="${initialFilePath}" placeholder="Paste copied file path...">
                <button id="generateFromInput">Generate from Input</button>
                <div id="successMessage" class="success-message">API Path generated successfully! (Scroll down to get the path)</div> <!-- Success message -->
            </div>

            <h2>Generated API Path:</h2>
            <div class="api-path-section">
                <textarea class="apiPathOutput" id="apiPathOutput" readonly></textarea>
                <div class="copy-button" id="copyButton">
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 2C5.34 2 4 3.34 4 5v14c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V8l-6-6H7zm0 2h7v5h5v12H7V4zm2 10h5v2H9v-2z"/></svg>
                </div>
                <div class="copy-notification hidden" id="copyNotification">Copied!</div>
            </div>

            <div class="section">
                <h2><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-1 14h2v-6h-2v6zm0-8h2V7h-2v2.5z"/></svg> JSON Validator</h2>
                <textarea id="jsonInput" placeholder="Paste your JSON here..."></textarea>
                <button id="validateJson">Validate JSON</button>
                <div id="jsonSuccessMessage" class="success-message hidden">JSON is valid!</div>
                <div id="jsonErrorMessage" class="error-message hidden">Invalid JSON: <span id="jsonErrorText"></span></div>
            </div> 
            
            <div class="section">
                <h2>Project Structure</h2>
                <textarea id="projectStructureOutput" readonly>${projectStructureJSON}</textarea>
                <button id="copyProjectButton" class="copy-button">Copy</button>
                <div id="projectCopyNotification" class="hidden">Project Structure Copied!</div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('generateFromInput').onclick = () => {
                const filePath = document.getElementById('filePathInput').value;
                vscode.postMessage({ command: 'generateFromInput', filePath: filePath });

                // Show success message
                const successMessage = document.getElementById('successMessage');
                successMessage.style.display = 'block';
                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 2000);
            };

            document.getElementById('copyButton').onclick = () => {
                const output = document.getElementById('apiPathOutput');
                output.select();
                document.execCommand('copy');
                const notification = document.getElementById('copyNotification');
                notification.classList.remove('hidden');
                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 2000);
            };
            
            document.getElementById('copyProjectButton').onclick = async () => {
                const projectStructure = document.getElementById('projectStructureOutput').value;
                try {
                    await navigator.clipboard.writeText(projectStructure);
                    const notification = document.getElementById('projectCopyNotification');
                    notification.classList.remove('hidden');
                    setTimeout(() => {
                        notification.classList.add('hidden');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy project structure to clipboard', err);
                }
            };

            // Listen for messages from the extension
            window.addEventListener('message', event => {
                const message = event.data; // The JSON data our extension sent
                switch (message.command) {
                    case 'updateApiPath':
                        const apiPath = message.apiPath;
                        document.getElementById('apiPathOutput').value = apiPath; // Update the textarea with the API path
                        break;
                }
            });

            document.getElementById('validateJson').onclick = () => {
                const jsonInput = document.getElementById('jsonInput').value;
                try {
                    JSON.parse(jsonInput);
                    document.getElementById('jsonSuccessMessage').style.display = 'block';
                    document.getElementById('jsonErrorMessage').style.display = 'none';
                    document.getElementById('jsonErrorText').textContent = ''; // Clear any previous error message
                } catch (error) {
                    document.getElementById('jsonErrorText').textContent = error.message; // Show error message
                    document.getElementById('jsonErrorMessage').style.display = 'block';
                    document.getElementById('jsonSuccessMessage').style.display = 'none'; // Hide success message
                }
            };

        </script>
    </body>
    </html>`;
}



export function deactivate() {}
