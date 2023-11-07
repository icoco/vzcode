import { useCallback } from 'react';
import { Button } from '../bootstrap';
import './style.scss';
import { startAIAssist } from '../AIAssist';
import {
  FileId,
  ShareDBDoc,
  VZCodeContent,
} from '../../types';
import { EditorCache } from '../useEditorCache';

// From
// https://primer.style/foundations/icons/zap-24
const ZapSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <path d="M15.716 1.329a1.341 1.341 0 0 1 2.109 1.55L15.147 9h4.161c1.623 0 2.372 2.016 1.143 3.075L8.102 22.721a1.148 1.148 0 0 1-1.81-1.317L8.996 15H4.674c-1.619 0-2.37-2.008-1.148-3.07l12.19-10.6Zm.452 1.595L4.51 13.061a.25.25 0 0 0 .164.439h5.45a.749.749 0 0 1 .692 1.041l-2.559 6.066 11.215-9.668a.25.25 0 0 0-.164-.439H14a.75.75 0 0 1-.687-1.05Z"></path>
  </svg>
);

export const AIAssistWidget = ({
  activeFileId,
  shareDBDoc,
  editorCache,
}: {
  activeFileId: FileId;
  shareDBDoc: ShareDBDoc<VZCodeContent>;
  editorCache: EditorCache;
}) => {
  const handleClick = useCallback(() => {
    // TODO make this happen
    // See src/client/AIAssist.ts

    startAIAssist(
      editorCache.get(activeFileId).editor,
      shareDBDoc,
      activeFileId,
    );
  }, [activeFileId]);
  return (
    <div className="vz-code-ai-assist-widget">
      <Button
        variant="light"
        title="Start AI Assist"
        onClick={handleClick}
      >
        <ZapSVG />
      </Button>
    </div>
  );
};
