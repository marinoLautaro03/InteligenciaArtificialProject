// Social network preview cards — visual approximation of how the post will look
const SocialPreview = ({ network, copy, tags, image, project }) => {
  const handle = (project?.name || "Tu marca").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 18) || "tumarca";
  const initials = (project?.glyph || "TM").slice(0, 2).toUpperCase();
  const renderTaggedText = (text, tagsArr) => {
    const fullText = text + (tagsArr && tagsArr.length ? "\n\n" + tagsArr.join(" ") : "");
    const parts = fullText.split(/(#[\wáéíóúñÁÉÍÓÚÑ]+)/g);
    return parts.map((p, i) => p.startsWith("#") ? <span key={i} className="tag">{p}</span> : p);
  };

  if (network === "instagram") {
    return (
      <div className="preview-frame full">
        <div className="ig">
          <div className="ig-head">
            <div className="ig-avatar">{initials}</div>
            <div>
              <div className="ig-handle">{handle}</div>
              <div className="ig-sub">Patrocinado · Buenos Aires</div>
            </div>
            <div style={{marginLeft:"auto"}}><Icons.More size={16} stroke="#262626"/></div>
          </div>
          <div className="ig-img">{image}</div>
          <div className="ig-actions">
            <Icons.Heart size={22} stroke="#262626"/>
            <Icons.Comment size={22} stroke="#262626"/>
            <Icons.Send size={22} stroke="#262626"/>
            <div className="right"><Icons.Save size={22} stroke="#262626"/></div>
          </div>
          <div className="ig-likes">2.847 Me gusta</div>
          <div className="ig-caption">
            <span className="handle">{handle}</span>
            {renderTaggedText(copy, tags)}
          </div>
        </div>
      </div>
    );
  }

  if (network === "x") {
    return (
      <div className="preview-frame full">
        <div className="tw">
          <div className="tw-avatar">{initials}</div>
          <div style={{minWidth:0}}>
            <div className="tw-head">
              <span className="tw-name">{project?.name || "Tu marca"}</span>
              <span className="tw-handle">@{handle} · 2h</span>
            </div>
            <div className="tw-text">{renderTaggedText(copy, tags)}</div>
            {image && <div className="tw-img">{image}</div>}
            <div className="tw-actions">
              <div><Icons.Comment size={16}/> 24</div>
              <div><Icons.Repost size={16}/> 89</div>
              <div><Icons.Heart size={16}/> 412</div>
              <div><Icons.Share size={16}/></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (network === "linkedin") {
    return (
      <div className="preview-frame full">
        <div className="li">
          <div className="li-head">
            <div className="li-avatar">{initials}</div>
            <div style={{minWidth:0,flex:1}}>
              <div className="li-name">{project?.name || "Tu marca"}</div>
              <div className="li-headline">Empresa · Software de marketing · 12.4K seguidores</div>
              <div className="li-time">Hace 3 h · <Icons.Globe size={11} stroke="rgba(0,0,0,0.6)"/></div>
            </div>
            <div><Icons.More size={18} stroke="rgba(0,0,0,0.6)"/></div>
          </div>
          <div className="li-text">{renderTaggedText(copy, tags)}</div>
          <div className="li-img">{image}</div>
          <div className="li-actions">
            <button><Icons.Like size={18}/> Recomendar</button>
            <button><Icons.Comment size={18}/> Comentar</button>
            <button><Icons.Repost size={18}/> Compartir</button>
            <button><Icons.Send size={18}/> Enviar</button>
          </div>
        </div>
      </div>
    );
  }

  if (network === "facebook") {
    return (
      <div className="preview-frame full">
        <div className="fb">
          <div className="fb-head">
            <div className="fb-avatar">{initials}</div>
            <div style={{minWidth:0,flex:1}}>
              <div className="fb-name">{project?.name || "Tu marca"}</div>
              <div className="fb-time">3 h · <Icons.Globe size={11} stroke="#65676b"/></div>
            </div>
            <div><Icons.More size={18} stroke="#65676b"/></div>
          </div>
          <div className="fb-text">{renderTaggedText(copy, tags)}</div>
          <div className="fb-img">{image}</div>
          <div className="fb-stats">
            <span>👍 ❤️</span>
            <span>1.2K</span>
            <span style={{marginLeft:"auto"}}>84 comentarios · 31 veces compartido</span>
          </div>
          <div className="fb-actions">
            <button><Icons.Like size={18}/> Me gusta</button>
            <button><Icons.Comment size={18}/> Comentar</button>
            <button><Icons.Share size={18}/> Compartir</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

window.SocialPreview = SocialPreview;
