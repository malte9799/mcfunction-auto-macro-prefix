"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    let dollarDecorationType = vscode.window.createTextEditorDecorationType({
        opacity: '0',
        border: 'none',
        borderColor: 'rgba(50, 255, 50, 0.5)',
        borderStyle: 'solid',
        borderWidth: '0 0 0 2px',
        textDecoration: `none; margin-left: -1ch;`,
    });
    let activeEditor = vscode.window.activeTextEditor;
    function isMcFunctionFile(document) {
        return document?.fileName.endsWith('.mcfunction') ?? false;
    }
    function getCompleteCommand(document, startLine) {
        let currentLine = startLine;
        let lines = [document.lineAt(currentLine).text];
        while (lines[lines.length - 1].trimEnd().endsWith('\\') && currentLine < document.lineCount - 1) {
            currentLine++;
            lines.push(document.lineAt(currentLine).text);
        }
        return {
            text: lines,
            endLine: currentLine,
        };
    }
    async function updateMultiLineCommand(editor, startLine, lines) {
        // if (lines[0].trimStart().startsWith('#')) {
        // 	return false;
        // }
        const fullText = lines.join('');
        const hasPattern = /\$\([a-zA-Z_1-9]+\)/.test(fullText);
        const firstLineStartsWithDollar = lines[0].trimStart().startsWith('$');
        const isComment = lines[0].trimStart().startsWith('#');
        const newLines = [...lines];
        const currentPosition = editor.selection.active;
        let cursorAdjustment = 0;
        const cursorLine = currentPosition.line - startLine;
        const cursorColumn = currentPosition.character;
        // For multi-line commands
        if (lines.length > 1) {
            // If there's a pattern, ensure only first line has $ and others don't
            if (hasPattern) {
                if (!firstLineStartsWithDollar && !isComment) {
                    newLines[0] = '$' + newLines[0];
                    if (cursorLine === 0)
                        cursorAdjustment = 1;
                }
                // Remove $ from all other lines if they have it
                for (let i = 1; i < newLines.length; i++) {
                    if (newLines[i].trimStart().startsWith('$')) {
                        newLines[i] = newLines[i].substring(1);
                        if (cursorLine === i)
                            cursorAdjustment = -1;
                    }
                }
            }
            else {
                // No pattern, remove $ from all lines
                for (let i = 0; i < newLines.length; i++) {
                    if (newLines[i].trimStart().startsWith('$')) {
                        newLines[i] = newLines[i].substring(1);
                        if (cursorLine === i)
                            cursorAdjustment = -1;
                    }
                }
            }
        }
        else {
            // Single line command
            if (hasPattern && !firstLineStartsWithDollar && !isComment) {
                cursorAdjustment = 1;
                newLines[0] = '$' + newLines[0];
            }
            else if (!hasPattern && firstLineStartsWithDollar) {
                cursorAdjustment = -1;
                newLines[0] = newLines[0].substring(1);
            }
        }
        // Apply changes if needed
        for (let i = 0; i < newLines.length; i++) {
            if (newLines[i] !== lines[i]) {
                const lineNumber = startLine + i;
                await editor.edit((editBuilder) => {
                    const lineRange = editor.document.lineAt(lineNumber).range;
                    editBuilder.replace(lineRange, newLines[i]);
                }, { undoStopBefore: false, undoStopAfter: false });
            }
        }
        if (cursorAdjustment !== 0) {
            const newPosition = currentPosition.with(currentPosition.line, Math.max(0, cursorColumn + cursorAdjustment));
            editor.selection = new vscode.Selection(newPosition, newPosition);
        }
        return hasPattern;
    }
    async function updateDecorations() {
        if (!activeEditor || !isMcFunctionFile(activeEditor.document)) {
            return;
        }
        const dollarDecorations = [];
        const document = activeEditor.document;
        let lineIndex = 0;
        while (lineIndex < document.lineCount) {
            const { text: lines, endLine } = getCompleteCommand(document, lineIndex);
            const needsDecoration = await updateMultiLineCommand(activeEditor, lineIndex, lines);
            if (needsDecoration && lines.length > 0 && lines[0].startsWith('$')) {
                const dollarRange = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, 1));
                dollarDecorations.push({ range: dollarRange });
            }
            lineIndex = endLine + 1;
        }
        activeEditor.setDecorations(dollarDecorationType, dollarDecorations);
    }
    if (activeEditor && isMcFunctionFile(activeEditor.document)) {
        updateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        activeEditor = editor;
        if (editor && isMcFunctionFile(editor.document)) {
            updateDecorations();
        }
        else {
            editor?.setDecorations(dollarDecorationType, []);
        }
    }, null, context.subscriptions);
    let timeout = undefined;
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (activeEditor && event.document === activeEditor.document && isMcFunctionFile(event.document)) {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                updateDecorations();
            }, 100);
        }
    }, null, context.subscriptions);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map