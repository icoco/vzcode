import { useContext,Suspense } from 'react';
import ShareDBClient from 'sharedb-client-browser/dist/sharedb-client-umd.cjs';
import { json1Presence } from '../../ot';
import { Username } from '../../types';
// @ts-ignore
import PrettierWorker from '../usePrettier/worker?worker';
// @ts-ignore
import TypeScriptWorker from '../useTypeScript/worker?worker';
import { SplitPaneResizeProvider } from '../SplitPaneResizeContext';
import { VZResizer } from '../VZResizer';
import {
  useInitialUsername,
  usePersistUsername,
} from '../usernameLocalStorage';
import { useShareDB} from './useShareDB';
import { VZLeft } from '../VZLeft';
import { VZMiddle } from '../VZMiddle';
import { VZRight } from '../VZRight';
import {
  VZCodeContext,
  VZCodeProvider,
} from '../VZCodeContext';
import './style.scss'; 

// Instantiate the Prettier worker.
const prettierWorker = new PrettierWorker();

// Instantiate the TypeScript worker.
const typeScriptWorker = new TypeScriptWorker();

const createShareDBClient = function(){
  if ( globalThis.wss){
    return ;
    try{
      globalThis.connection.close();
      globalThis.connection = null;

      const wss = globalThis.wss;
      wss.close();
      globalThis.wss = null;
 
    }catch(ex){

    }
  }
  // Register our custom JSON1 OT type that supports presence.
  // See https://github.com/vizhub-core/json1-presence
  ShareDBClient.types.register(json1Presence.type);
  console.log('🔥 App init ShareDBClient')
  // Establish the singleton ShareDB connection over WebSockets.
  // TODO consider using reconnecting WebSocket
  const { Connection } = ShareDBClient;
  const wsProtocol =
    window.location.protocol === 'https:'
      ? 'wss://'
      : 'ws://';
  const socket = new WebSocket(
    wsProtocol + window.location.host + '/ws',
  );
  const connection = new Connection(socket);
  globalThis.wss = socket;
  globalThis.connection = Connection;

  return connection;
}

// Stores the username to local storage.
// TODO consider if there's a cleaner pattern for this.
// This makes sense in VZCode itself, but for an app with
// authentication that wraps VZCode, it is not required.
const PersistUsername = () => {
  const { username } = useContext(VZCodeContext);
  usePersistUsername(username);
  return null;
};

function App() {   
  const connection = createShareDBClient(); 
  const {
    shareDBDoc,
    content,
    localPresence,
    docPresence,
    submitOperation,
    connected,
  } = useShareDB({
    connection,
  });

  // Get the initial username from localStorage.
  const initialUsername: Username = useInitialUsername();

  // Feature flag for enabling the right-side panel.
  // Useful for debugging dual split pane functionality.
  // We may want to add this as an actual VZCode feature,
  // for running the code that the VZCode user is developing
  // in the same browser window as the VZCode editor,
  // so that multiple browser windows are not required.
  const enableRightPanel = true;

  return (
    <SplitPaneResizeProvider>
      <VZCodeProvider
        content={content}
        shareDBDoc={shareDBDoc}
        submitOperation={submitOperation}
        localPresence={localPresence}
        docPresence={docPresence}
        prettierWorker={prettierWorker}
        typeScriptWorker={typeScriptWorker}
        initialUsername={initialUsername}
        connected={connected}
      >
        <div className="app">
          <VZLeft />
          <VZMiddle allowGlobals={true} />
          {enableRightPanel ? <VZRight /> : null}
          <VZResizer side="left" />
          {enableRightPanel ? (
            <VZResizer side="right" />
          ) : null}
        </div>
        <PersistUsername />
      </VZCodeProvider>
    </SplitPaneResizeProvider>
  );
}

export default App;
