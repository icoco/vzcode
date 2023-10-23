import {
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import {
  FileId,
  ShareDBDoc,
  VZCodeContent,
} from '../../types';
import { ThemeLabel, defaultTheme } from '../themes';
import {
  EditorCache,
  EditorCacheValue,
} from '../useEditorCache';
import { getOrCreateEditor } from './getOrCreateEditor';
import './style.scss';

export const CodeEditor = ({
  activeFileId,
  shareDBDoc,
  submitOperation,
  localPresence,
  docPresence,
  theme = defaultTheme,
  filesPath = ['files'],
  editorCache,
}: {
  activeFileId: FileId;
  shareDBDoc: ShareDBDoc<VZCodeContent> | null;
  submitOperation: (
    next: (content: VZCodeContent) => VZCodeContent,
  ) => void;
  localPresence?: any;
  docPresence?: any;
  theme?: ThemeLabel;

  // The path of the files object in the ShareDB document.
  // Defaults to `files` if not provided.
  filesPath?: string[];
  editorCache: EditorCache;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set `doc.data.isInteracting` to `true` when the user is interacting
  // via interactive code widgets (e.g. Alt+drag), and `false` when they are not.
  const interactTimeoutRef = useRef(null);

  const onInteract = useCallback(() => {
    // Set `isInteracting: true` if not already set.
    if (!interactTimeoutRef.current) {
      submitOperation((document) => ({
        ...document,
        isInteracting: true,
      }));
    } else {
      clearTimeout(interactTimeoutRef.current);
    }

    // Set `isInteracting: false` after a delay.
    interactTimeoutRef.current = setTimeout(() => {
      interactTimeoutRef.current = null;
      submitOperation((document) => ({
        ...document,
        isInteracting: false,
      }));
    }, 800);
  }, [submitOperation]);

  // Every time the active file switches from one file to another,
  // the editor corresponding to the old file is removed from the DOM,
  // and the editor corresponding to the new file is added to the DOM.
  useLayoutEffect(() => {
    // Guard against cases where page is still loading.
    if (!ref.current) return;
    if (!shareDBDoc) return;

    // Get the editor corresponding to the active file.
    // Looks in `editorCache` first, and if not found, creates a new editor.
    const editorCacheValue: EditorCacheValue =
      getOrCreateEditor({
        fileId: activeFileId,
        shareDBDoc,
        filesPath,
        localPresence,
        docPresence,
        theme,
        onInteract,
        editorCache,
      });

    // Add the editor to the DOM.
    ref.current.appendChild(editorCacheValue.editor.dom);

    return () => {
      // Remove the old editor from the DOM.
      // This happens every time `activeFileId` changes.
      ref.current.removeChild(editorCacheValue.editor.dom);
    };
  }, [shareDBDoc, activeFileId, onInteract]);

  return <div className="vz-code-editor" ref={ref}></div>;
};
