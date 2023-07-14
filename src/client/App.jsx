import { useState, useEffect, useMemo, useCallback } from 'react';
import ShareDBClient from 'sharedb-client-browser/dist/sharedb-client-umd.cjs';
import { json1Presence } from '../ot';
import { randomId } from '../randomId';
import { CodeEditor } from './CodeEditor';
import { diff } from './diff';
import { Settings } from './settings';
import { Sidebar } from './Sidebar';
import './style.css';
import { oneDark } from '@codemirror/theme-one-dark';
import { render } from 'react-dom';

// Register our custom JSON1 OT type that supports presence.
// See https://github.com/vizhub-core/json1-presence
ShareDBClient.types.register(json1Presence.type);

// Establish the singleton ShareDB connection over WebSockets.
// TODO consider using reconnecting WebSocket
const { Connection } = ShareDBClient;
const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const socket = new WebSocket(wsProtocol + window.location.host + '/ws');
const connection = new Connection(socket);

function App() {
  // The ShareDB document.
  const [shareDBDoc, setShareDBDoc] = useState(null);

  // Local ShareDB presence, for broadcasting our cursor position
  // so other clients can see it.
  // See https://share.github.io/sharedb/api/local-presence
  const [localPresence, setLocalPresence] = useState(null);

  // The document-level presence object, which emits
  // changes in remote presence.
  const [docPresence, setDocPresence] = useState(null);

  // The `doc.data` part of the ShareDB document,
  // updated on each change to decouple rendering from ShareDB.
  const [data, setData] = useState(null);

  // True if the file menu is open.
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  // The id of the currently open file tab.
  const [activeFileId, setActiveFileId] = useState(null);

  // The ordered list of tabs.
  const [tabList, setTabList] = useState([]);

  // The current theme.
  const [theme, setTheme] = useState(oneDark);

  // True to show the settings modal.
  const [settings, setSettings] = useState(false);

  // Set up the connection to ShareDB.
  useEffect(() => {
    // Since there is only ever a single document,
    // these things are pretty arbitrary.
    //  * `collection` - the ShareDB collection to use
    //  * `id` - the id of the ShareDB document to use
    const collection = 'documents';
    const id = '1';

    // Initialize the ShareDB document.
    const shareDBDoc = connection.get(collection, id);

    // Subscribe to the document to get updates.
    // This callback gets called once only.
    shareDBDoc.subscribe(() => {
      // Expose ShareDB doc to downstream logic.
      setShareDBDoc(shareDBDoc);

      // Set initial data.
      setData(shareDBDoc.data);

      // Listen for all changes and update `data`.
      // This decouples rendering logic from ShareDB.
      // This callback gets called on each change.
      shareDBDoc.on('op', (op) => {
        setData(shareDBDoc.data);
      });

      // Set up presence.
      // See https://github.com/share/sharedb/blob/master/examples/rich-text-presence/client.js#L53
      const docPresence = shareDBDoc.connection.getDocPresence(collection, id);

      // Subscribe to receive remote presence updates.
      docPresence.subscribe(function (error) {
        if (error) throw error;
      });

      // Set up our local presence for broadcasting this client's presence.
      setLocalPresence(docPresence.create(randomId()));

      // Store docPresence so child components can listen for changes.
      setDocPresence(docPresence);
    });

    // TODO unsubscribe from presence
    // TODO unsubscribe from doc
  }, []);

  // Called when a tab is closed.
  const closeTab = useCallback(
    (fileIdToRemove) => {
      const i = tabList.findIndex((fileId) => fileId === fileIdToRemove);

      // Support calling `closeTab` on a fileId that is not open,
      // such as when a file is deleted..
      if (i !== -1) {
        // Remove the tab from the tab list.
        const newTabList = [...tabList.slice(0, i), ...tabList.slice(i + 1)];
        setTabList(newTabList);

        // If we are closing the active file,
        if (activeFileId === fileIdToRemove) {
          // set the new active file to the next tab over,
          if (newTabList.length > 0) {
            setActiveFileId(i === 0 ? newTabList[i] : newTabList[i - 1]);
          } else {
            // or clear out the active file
            // if we've closed the last tab.
            setActiveFileId(null);
          }
        }
      }
    },
    [tabList, activeFileId]
  );

  const handleCloseTabClick = useCallback(
    (fileIdToRemove) => (event) => {
      // Stop propagation so that the outer listener doesn't fire.
      event.stopPropagation();
      closeTab(fileIdToRemove);
    },
    [closeTab]
  );

  // Called when a file in the sidebar is double-clicked.
  const handleRenameFileClick = useCallback(
    (key) => {
      const newName = prompt('Enter new name');
      if (newName) {
        const currentDocument = shareDBDoc.data;
        const nextDocument = {
          ...currentDocument,
          [key]: {
            ...currentDocument[key],
            name: newName,
          },
        };
        shareDBDoc.submitOp(diff(currentDocument, nextDocument));
      }
    },
    [shareDBDoc]
  );

  const deleteFile = useCallback(
    (key) => {
      // Close the tab in case it's open.
      // TODO consistently use either "key" or "fileId" naming
      closeTab(key);

      const currentDocument = shareDBDoc.data;
      const nextDocument = { ...currentDocument };
      delete nextDocument[key];
      shareDBDoc.submitOp(diff(currentDocument, nextDocument));
    },
    [shareDBDoc, closeTab]
  );

  const handleFileClick = useCallback(
    (fileId) => {
      setActiveFileId(fileId);
      if (!tabList.includes(fileId)) {
        setTabList([...tabList, fileId]);
      }
    },
    [tabList]
  );

  // TODO prompt the user "Are you sure?"
  const handleDeleteFileClick = useCallback(
    (fileId, event) => {
      // Stop propagation so that the outer listener doesn't fire,
      // which would try to open this file in a tab.
      event.stopPropagation();
      deleteFile(fileId);
    },
    [deleteFile]
  );

  const createFile = useCallback(() => {
    const name = prompt('Enter new file name');
    if (!name) return;
    const currentDocument = shareDBDoc.data;
    const nextDocument = {
      ...currentDocument,
      [randomId()]: { name, text: '' },
    };
    shareDBDoc.submitOp(diff(currentDocument, nextDocument));
  }, [shareDBDoc]);

  // True if we are ready to actually render the active tab.
  const tabValid = data && activeFileId;

  const handleSettingsClose = useCallback(() => {
    setSettings(false);
  }, []);

  const fileNameSplit = (fileName) => {
    const split = fileName.split('/');
    //adding the folder that the is in to the tab name
    if (split.length === 1) return split[split.length - 1];
    return split[split.length - 2] + '/' + split[split.length - 1];
  };

  const editor = <CodeEditor
    className="editor"
    shareDBDoc={shareDBDoc}
    localPresence={localPresence}
    docPresence={docPresence}
    activeFileId={activeFileId}
    theme={theme}
  />;

  return (
    <>
      <Settings
        show={settings}
        onClose={handleSettingsClose}
        setTheme={setTheme}
        editor={editor}
      />
      <div className="tab-list">
        {tabList.map((fileId) => (
          <div
            key={fileId}
            className={
              tabValid ? `tab${fileId === activeFileId ? ' active' : ''}` : null
            }
            onClick={() => {
              setActiveFileId(fileId);
            }}
          >
            {tabValid ? fileNameSplit(data[fileId].name) : ''}
            <div
              className={activeFileId ? 'bx bx-x tab-close' : ''}
              onClick={handleCloseTabClick(fileId)}
            ></div>
          </div>
        ))}
      </div>
      <Sidebar
        createFile={createFile}
        data={data}
        handleRenameFileClick={handleRenameFileClick}
        handleDeleteFileClick={handleDeleteFileClick}
        handleFileClick={handleFileClick}
        setSettings={setSettings}
        settings={settings}
      />
      {data && activeFileId ? (
        editor
      ) : null}
    </>
  );
}

export default App;