import './SocialPreview.css';
import {
  Heart, Comment, PaperSend, Bookmark,
  Repost, ShareIcon, MoreHoriz, Globe, ThumbsUp,
} from './Icons';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';

type SocialPreviewProps = {
  network: Network;
  copy: string;
  hashtags: string[];
  imageUrl: string | null;
  projectName: string;
};

function renderTaggedText(copy: string, hashtags: string[]) {
  const fullText = hashtags.length > 0 ? `${copy}\n\n${hashtags.join(' ')}` : copy;
  const parts = fullText.split(/(#[\wáéíóúñÁÉÍÓÚÑ]+)/g);
  return parts.map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="sp-tag">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function getHandle(projectName: string) {
  return projectName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 18) || 'tumarca';
}

function getInitials(projectName: string) {
  return projectName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
}

export default function SocialPreview({ network, copy, hashtags, imageUrl, projectName }: SocialPreviewProps) {
  const handle = getHandle(projectName);
  const initials = getInitials(projectName);

  if (network === 'instagram') {
    return (
      <div className="preview-frame">
        <div className="ig">
          <div className="ig-head">
            <div className="ig-avatar">{initials}</div>
            <div>
              <div className="ig-handle">{handle}</div>
              <div className="ig-sub">Patrocinado · Buenos Aires</div>
            </div>
            <div className="ig-more"><MoreHoriz size={16} /></div>
          </div>
          <div className="ig-img">
            {imageUrl && <img src={imageUrl} alt="" />}
          </div>
          <div className="ig-actions">
            <Heart size={22} />
            <Comment size={22} />
            <PaperSend size={22} />
            <div className="ig-bookmark"><Bookmark size={22} /></div>
          </div>
          <div className="ig-likes">2.847 Me gusta</div>
          <div className="ig-caption">
            <span className="sp-handle">{handle}</span>
            {renderTaggedText(copy, hashtags)}
          </div>
        </div>
      </div>
    );
  }

  if (network === 'x') {
    return (
      <div className="preview-frame">
        <div className="tw">
          <div className="tw-avatar">{initials}</div>
          <div>
            <div className="tw-head">
              <span className="tw-name">{projectName}</span>
              <span className="tw-handle">@{handle} · 2h</span>
            </div>
            <div className="tw-text">{renderTaggedText(copy, hashtags)}</div>
            {imageUrl && (
              <div className="tw-img"><img src={imageUrl} alt="" /></div>
            )}
            <div className="tw-actions">
              <span className="tw-action"><Comment size={16} /> 24</span>
              <span className="tw-action"><Repost size={16} /> 89</span>
              <span className="tw-action"><Heart size={16} /> 412</span>
              <span className="tw-action"><ShareIcon size={16} /></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (network === 'linkedin') {
    return (
      <div className="preview-frame">
        <div className="li">
          <div className="li-head">
            <div className="li-avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="li-name">{projectName}</div>
              <div className="li-headline">Empresa · Software de marketing · 12.4K seguidores</div>
              <div className="li-time">
                Hace 3 h · <Globe size={11} />
              </div>
            </div>
            <div className="li-more"><MoreHoriz size={18} /></div>
          </div>
          <div className="li-text">{renderTaggedText(copy, hashtags)}</div>
          {imageUrl && (
            <div className="li-img"><img src={imageUrl} alt="" /></div>
          )}
          <div className="li-actions">
            <button><ThumbsUp size={18} /> Recomendar</button>
            <button><Comment size={18} /> Comentar</button>
            <button><Repost size={18} /> Compartir</button>
            <button><PaperSend size={18} /> Enviar</button>
          </div>
        </div>
      </div>
    );
  }

  if (network === 'facebook') {
    return (
      <div className="preview-frame">
        <div className="fb">
          <div className="fb-head">
            <div className="fb-avatar">{initials}</div>
            <div style={{ flex: 1 }}>
              <div className="fb-name">{projectName}</div>
              <div className="fb-time">
                3 h · <Globe size={11} />
              </div>
            </div>
            <div className="fb-more"><MoreHoriz size={18} /></div>
          </div>
          <div className="fb-text">{renderTaggedText(copy, hashtags)}</div>
          {imageUrl && (
            <div className="fb-img"><img src={imageUrl} alt="" /></div>
          )}
          <div className="fb-stats">
            <span>👍 ❤️</span>
            <span>1.2K</span>
            <span className="fb-stats-right">84 comentarios · 31 veces compartido</span>
          </div>
          <div className="fb-actions">
            <button><ThumbsUp size={18} /> Me gusta</button>
            <button><Comment size={18} /> Comentar</button>
            <button><ShareIcon size={18} /> Compartir</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
