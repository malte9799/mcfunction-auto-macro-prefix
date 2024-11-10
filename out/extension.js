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
    async function updateLine(editor, line, text) {
        const hasPattern = /\$\([a-zA-Z_]+\)/.test(text);
        const startsWithDollar = text.startsWith('$');
        let newText = text;
        let cursorAdjustment = 0;
        if (hasPattern && !startsWithDollar) {
            newText = '$' + text;
            cursorAdjustment = 1;
        }
        else if (!hasPattern && startsWithDollar) {
            newText = text.substring(1);
            cursorAdjustment = -1;
        }
        if (newText !== text) {
            const currentPosition = editor.selection.active;
            const isActiveLine = currentPosition.line === line;
            const cursorColumn = currentPosition.character;
            await editor.edit((editBuilder) => {
                const lineRange = editor.document.lineAt(line).range;
                editBuilder.replace(lineRange, newText);
            }, { undoStopBefore: false, undoStopAfter: false });
            // Adjust cursor position if we're on the edited line
            if (isActiveLine && cursorAdjustment !== 0) {
                const newPosition = currentPosition.with(currentPosition.line, Math.max(0, cursorColumn + cursorAdjustment));
                editor.selection = new vscode.Selection(newPosition, newPosition);
            }
        }
        return hasPattern || startsWithDollar;
    }
    async function updateDecorations() {
        if (!activeEditor || !isMcFunctionFile(activeEditor.document)) {
            return;
        }
        const dollarDecorations = [];
        const document = activeEditor.document;
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const lineText = document.lineAt(lineIndex).text;
            const needsDecoration = await updateLine(activeEditor, lineIndex, lineText);
            if (needsDecoration) {
                const dollarRange = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, 1));
                dollarDecorations.push({ range: dollarRange });
            }
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