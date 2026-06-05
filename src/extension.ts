import * as vscode from 'vscode';

const GROUP_ID = 'io.github.diegoalegil';
const ARTIFACT_ID = 'tsunagi';

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('tsunagi.insertDependency', insertDependency),
        vscode.commands.registerCommand('tsunagi.searchAnime', searchAnime),
    );
}

export function deactivate(): void {
    // nothing to clean up
}

/** Inserts the Tsunagi <dependency> into the project's pom.xml. */
async function insertDependency(): Promise<void> {
    const pom = await pickPom();
    if (!pom) {
        return;
    }

    const document = await vscode.workspace.openTextDocument(pom);
    const text = document.getText();

    if (text.includes(`<artifactId>${ARTIFACT_ID}</artifactId>`)) {
        vscode.window.showInformationMessage('Tsunagi is already a dependency in this pom.xml.');
        await vscode.window.showTextDocument(document);
        return;
    }

    const version = vscode.workspace.getConfiguration('tsunagi').get<string>('version', '1.3.0');
    const edit = new vscode.WorkspaceEdit();
    const dependency =
        `        <dependency>\n` +
        `            <groupId>${GROUP_ID}</groupId>\n` +
        `            <artifactId>${ARTIFACT_ID}</artifactId>\n` +
        `            <version>${version}</version>\n` +
        `        </dependency>\n`;

    const closingDeps = text.indexOf('</dependencies>');
    if (closingDeps !== -1) {
        edit.insert(pom, document.positionAt(closingDeps), dependency);
    } else {
        const closingProject = text.indexOf('</project>');
        if (closingProject === -1) {
            vscode.window.showErrorMessage('This pom.xml has no </project> tag; it does not look valid.');
            return;
        }
        const block = `    <dependencies>\n${dependency}    </dependencies>\n\n`;
        edit.insert(pom, document.positionAt(closingProject), block);
    }

    const applied = await vscode.workspace.applyEdit(edit);
    if (applied) {
        await document.save();
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage(`Added ${ARTIFACT_ID} ${version} to pom.xml.`);
    } else {
        vscode.window.showErrorMessage('Could not modify pom.xml.');
    }
}

/** Finds a pom.xml in the workspace, asking the user to choose when there are several. */
async function pickPom(): Promise<vscode.Uri | undefined> {
    const poms = await vscode.workspace.findFiles('**/pom.xml', '**/target/**', 50);
    if (poms.length === 0) {
        vscode.window.showWarningMessage('No pom.xml found in this workspace. Tsunagi needs a Maven project.');
        return undefined;
    }
    if (poms.length === 1) {
        return poms[0];
    }
    const picked = await vscode.window.showQuickPick(
        poms.map((uri) => ({ label: vscode.workspace.asRelativePath(uri), uri })),
        { placeHolder: 'Select the pom.xml to add the Tsunagi dependency to' },
    );
    return picked?.uri;
}

interface AniListMedia {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    startDate: { year?: number };
    averageScore?: number;
    coverImage: { large?: string };
}

const SEARCH_QUERY = `query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { romaji english native }
    startDate { year }
    averageScore
    coverImage { large }
  }
}`;

/** Searches AniList for an anime and shows the result. */
async function searchAnime(): Promise<void> {
    const title = await vscode.window.showInputBox({
        prompt: 'Search an anime on AniList',
        placeHolder: 'e.g. Cowboy Bebop',
    });
    if (!title) {
        return;
    }

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Searching "${title}"...` },
        async () => {
            try {
                const response = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: title } }),
                });

                if (response.status === 404) {
                    vscode.window.showInformationMessage(`No anime found for "${title}".`);
                    return;
                }
                if (!response.ok) {
                    vscode.window.showErrorMessage(`AniList request failed with status ${response.status}.`);
                    return;
                }

                const json = (await response.json()) as { data?: { Media?: AniListMedia | null } };
                const media = json.data?.Media;
                if (!media) {
                    vscode.window.showInformationMessage(`No anime found for "${title}".`);
                    return;
                }

                const name = media.title.romaji ?? media.title.english ?? media.title.native ?? title;
                const native = media.title.native && media.title.native !== name ? ` / ${media.title.native}` : '';
                const year = media.startDate.year ?? 'unknown year';
                const score = media.averageScore !== undefined ? `${media.averageScore}/100` : 'no score';
                const image = media.coverImage.large;

                const action = await vscode.window.showInformationMessage(
                    `${name}${native} (${year}) — ${score}`,
                    ...(image ? ['Open cover image'] : []),
                );
                if (action && image) {
                    await vscode.env.openExternal(vscode.Uri.parse(image));
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Tsunagi search failed: ${(error as Error).message}`);
            }
        },
    );
}
