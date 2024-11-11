import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let dollarDecorationType = vscode.window.createTextEditorDecorationType({
		opacity: '0',
		border: 'none',
		borderColor: 'rgba(50, 255, 50, 0.5)',
		borderStyle: 'solid',
		borderWidth: '0 0 0 2px',
		textDecoration: `none; margin-left: -1ch;`,
	});

	let activeEditor = vscode.window.activeTextEditor;

	function isMcFunctionFile(document: vscode.TextDocument | undefined): boolean {
		return document?.fileName.endsWith('.mcfunction') ?? false;
	}

	function getCompleteCommand(document: vscode.TextDocument, startLine: number): { text: string[]; endLine: number } {
		let currentLine = startLine;
		let lines: string[] = [document.lineAt(currentLine).text];

		while (lines[lines.length - 1].trimEnd().endsWith('\\') && currentLine < document.lineCount - 1) {
			currentLine++;
			lines.push(document.lineAt(currentLine).text);
		}

		return {
			text: lines,
			endLine: currentLine,
		};
	}

	async function updateMultiLineCommand(editor: vscode.TextEditor, startLine: number, lines: string[]) {
		// if (lines[0].trimStart().startsWith('#')) {
		// 	return false;
		// }

		const fullText = lines.join('');
		const hasPattern = /\$\([a-zA-Z_]+\)/.test(fullText);
		const firstLineStartsWithDollar = lines[0].trimStart().startsWith('$');
		const isComment = lines[0].trimStart().startsWith('#');
		const newLines = [...lines];

		// For multi-line commands
		if (lines.length > 1) {
			// If there's a pattern, ensure only first line has $ and others don't
			if (hasPattern) {
				if (!firstLineStartsWithDollar && !isComment) {
					newLines[0] = '$' + newLines[0];
				}
				// Remove $ from all other lines if they have it
				for (let i = 1; i < newLines.length; i++) {
					if (newLines[i].startsWith('$')) {
						newLines[i] = newLines[i].substring(1);
					}
				}
			} else {
				// No pattern, remove $ from all lines
				for (let i = 0; i < newLines.length; i++) {
					if (newLines[i].startsWith('$')) {
						newLines[i] = newLines[i].substring(1);
					}
				}
			}
		} else {
			// Single line command
			if (hasPattern && !firstLineStartsWithDollar && !isComment) {
				newLines[0] = '$' + newLines[0];
			} else if (!hasPattern && firstLineStartsWithDollar) {
				newLines[0] = newLines[0].substring(1);
			}
		}

		// Apply changes if needed
		for (let i = 0; i < newLines.length; i++) {
			if (newLines[i] !== lines[i]) {
				const lineNumber = startLine + i;
				await editor.edit(
					(editBuilder) => {
						const lineRange = editor.document.lineAt(lineNumber).range;
						editBuilder.replace(lineRange, newLines[i]);
					},
					{ undoStopBefore: false, undoStopAfter: false }
				);
			}
		}

		return hasPattern;
	}

	async function updateDecorations() {
		if (!activeEditor || !isMcFunctionFile(activeEditor.document)) {
			return;
		}

		const dollarDecorations: vscode.DecorationOptions[] = [];
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

	vscode.window.onDidChangeActiveTextEditor(
		(editor) => {
			activeEditor = editor;
			if (editor && isMcFunctionFile(editor.document)) {
				updateDecorations();
			} else {
				editor?.setDecorations(dollarDecorationType, []);
			}
		},
		null,
		context.subscriptions
	);

	let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (activeEditor && event.document === activeEditor.document && isMcFunctionFile(event.document)) {
				if (timeout) {
					clearTimeout(timeout);
				}
				timeout = setTimeout(() => {
					updateDecorations();
				}, 100);
			}
		},
		null,
		context.subscriptions
	);
}

export function deactivate() {}
