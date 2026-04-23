import { useState, useEffect, useRef } from "react";
import { hasSupabase, cloudLoad, cloudSave, cloudSubscribe, signInWithGoogle, supabaseSignOut, getCurrentSession, onAuthChange, ALLOWED_EMAIL_DOMAIN } from "./supabase";

const uid = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();
const fmt = iso => new Date(iso).toLocaleString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const fmtD = iso => new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
const fmtRel = iso => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d/60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d/3600)} h`;
  if (d < 604800) return `il y a ${Math.floor(d/86400)} j`;
  return fmtD(iso);
};

const C = {
  primary:'#5100FF', primaryLight:'#F7F6FF', primarySoft:'#EDEAFF', primaryDark:'#3F00CC',
  success:'#12AC64', successBg:'#E7F7EE',
  danger:'#FF4C4C',  dangerBg:'#FFEBEB',
  alert:'#DA9705',   alertBg:'#FEF6E7',
  info:'#52A0EE',    infoBg:'#EAF4FD',
  text:'#000000', muted:'#585858', border:'#CECECE', borderSoft:'#E8E8E8',
  bg:'#FFFFFF', bgTint:'#F7F6FF'
};

const ST = {
  "Brouillon":        {color:'#585858',  bg:'#F3F3F3',    dot:'#585858'},
  "Review demandée":  {color:C.alert,    bg:C.alertBg,    dot:C.alert},
  "Approuvée":        {color:C.success,  bg:C.successBg,  dot:C.success},
  "Révision requise": {color:C.danger,   bg:C.dangerBg,   dot:C.danger},
};
const RC = {Admin:C.primary, Design:'#A855F7', Dev:C.info, Membre:'#585858'};

const PROJECT_COLORS = [
  '#5100FF', // violet primaire
  '#52A0EE', // bleu
  '#12AC64', // vert
  '#DA9705', // ambre
  '#FF4C4C', // rouge
  '#A855F7', // pourpre
  '#EC4899', // rose
  '#14B8A6', // sarcelle
  '#F97316', // orange
  '#64748B', // ardoise
];

const SEED = {
  accessKey: 'DIV-2026',
  currentUserId: null,
  users: [],
  projects: [],
  roadmap: [],
  notifications: [],
};

// ──────────────────── ICONS ────────────────────
const Icon = ({n,s=18,c='currentColor'}) => {
  const p={width:s,height:s,viewBox:'0 0 24 24',fill:'none',stroke:c,strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'};
  const paths={
    home:<><path d="M3 10l9-7 9 7v11a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V10z"/></>,
    folder:<><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></>,
    folderOpen:<><path d="M3 7v12a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-9l-2-2H5a2 2 0 00-2 2z"/></>,
    users:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    user:<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    search:<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    bell:<><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></>,
    plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chevRight:<><polyline points="9 18 15 12 9 6"/></>,
    chevDown:<><polyline points="6 9 12 15 18 9"/></>,
    external:<><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    check:<><polyline points="20 6 9 17 4 12"/></>,
    x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    reply:<><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></>,
    msg:<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    version:<><circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><line x1="5" y1="9" x2="5" y2="15"/><path d="M19 8v2a4 4 0 01-4 4H9"/><circle cx="19" cy="6" r="3"/></>,
    more:<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    alertCircle:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    question:<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    refresh:<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
    trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
    edit:<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    logout:<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    target:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    flag:<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    mail:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    image:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    menu:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    code:<><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    rocket:<><path d="M5 11l-3 3 2 2 3-3"/><path d="M19 13l3-3-2-2-3 3"/><path d="M14 5l-4 4-3 7 4-2 3-3 4-4-4-2z"/></>,
    bolt:<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    arrowLeft:<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  };
  return <svg {...p}>{paths[n]}</svg>;
};

// ──────────────────── HELPERS ────────────────────
function Badge({status, size='md'}){
  const s=ST[status]||ST["Brouillon"];
  const pad=size==='sm'?'2px 8px':'4px 10px';
  const fs=size==='sm'?11:12;
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:pad,borderRadius:999,background:s.bg,color:s.color,fontSize:fs,fontWeight:600,whiteSpace:'nowrap'}}>
    <span style={{width:6,height:6,borderRadius:'50%',background:s.dot,flexShrink:0}}/>{status}
  </span>;
}
function RoleBadge({role}){
  const c=RC[role]||C.muted;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 9px',borderRadius:999,background:`${c}14`,color:c,fontSize:11,fontWeight:600}}>
    {role==='Admin' && <Icon n="shield" s={10} c={c}/>}
    {role}
  </span>;
}
function Avatar({user,size=32}){
  if(!user) return <span style={{width:size,height:size,borderRadius:'50%',background:'#E8E8E8',flexShrink:0}}/>;
  const c=RC[user.role]||C.muted;
  const initial=(user.name||'?').trim()[0].toUpperCase();
  return <span title={`${user.name} · ${user.role}`} style={{width:size,height:size,borderRadius:'50%',background:c,color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:size*.42,fontWeight:700,flexShrink:0}}>{initial}</span>;
}
function Field({label,value,onChange,multiline,placeholder,type='text',hint}){
  const s={width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 12px',color:C.text,fontSize:13.5,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color .15s'};
  return <div>
    {label && <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:6,fontWeight:500}}>{label}</label>}
    {multiline
      ?<textarea value={value} onChange={e=>onChange(e.target.value)} style={{...s,resize:'none'}} rows={3} placeholder={placeholder||''}/>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} style={s} placeholder={placeholder||''}/>}
    {hint && <div style={{fontSize:11,color:C.muted,marginTop:4}}>{hint}</div>}
  </div>;
}
function IconBtn({icon,onClick,label,variant='ghost',size=16,title}){
  const s={ghost:{background:'transparent',color:C.muted,border:'none'},soft:{background:C.bgTint,color:C.text,border:'none'},outline:{background:C.bg,color:C.text,border:`1px solid ${C.borderSoft}`},primary:{background:C.primary,color:'#fff',border:'none'}};
  return <button title={title||label} onClick={onClick} style={{...s[variant],padding:label?'7px 12px':'7px',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:500,transition:'all .15s'}}>
    <Icon n={icon} s={size}/>{label}
  </button>;
}
function EmptyState({icon,title,desc,actionLabel,onAction}){
  return <div style={{background:C.bgTint,border:`1px dashed ${C.border}`,borderRadius:12,padding:'48px 20px',textAlign:'center'}}>
    <div style={{width:48,height:48,borderRadius:12,background:C.bg,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
      <Icon n={icon} s={22} c={C.muted}/>
    </div>
    <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{title}</div>
    {desc && <div style={{color:C.muted,fontSize:13,marginBottom:14}}>{desc}</div>}
    {actionLabel && <button onClick={onAction} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer'}}>{actionLabel}</button>}
  </div>;
}
function Logo({size=32}){
  return <img src="/favicon.svg" alt="DIV Design" width={size} height={size} style={{display:'block',borderRadius:size*.28}}/>;
}

// ──────────────────── AUTH SCREEN ────────────────────
function GoogleIcon({size=18}){
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.4-4.5 2.3-7.3 2.3-5.2 0-9.6-3.3-11.2-7.9l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.3 5.3c-.5.4 6.7-4.9 6.7-14.8 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AuthScreen({ data, save, authError, setAuthError }) {
  const [keyOk, setKeyOk] = useState(() => sessionStorage.getItem('divdesign_keyok') === '1');
  const [keyInput, setKeyInput] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (authError) setErr(authError); }, [authError]);

  const validateKey = () => {
    setErr(''); setAuthError && setAuthError('');
    const expected = (data.accessKey || '').trim();
    if (!expected) return setErr("Aucune clé d'accès n'est configurée. Contactez l'administrateur.");
    if (keyInput.trim() === expected) {
      sessionStorage.setItem('divdesign_keyok', '1');
      setKeyOk(true);
    } else {
      setErr("Clé d'accès incorrecte.");
    }
  };

  const signIn = async () => {
    setErr(''); setAuthError && setAuthError('');
    if (!hasSupabase) {
      setErr("Supabase n'est pas configuré. Remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local puis redémarre.");
      return;
    }
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { setLoading(false); setErr(error.message || 'Échec de la connexion Google.'); }
    // On success, le navigateur est redirigé vers Google.
  };

  const resetKey = () => {
    sessionStorage.removeItem('divdesign_keyok');
    setKeyOk(false);
    setKeyInput('');
    setErr('');
    setAuthError && setAuthError('');
  };

  return (
    <div style={{height:'100vh',display:'flex',background:C.bgTint,fontFamily:"'Inter',system-ui,sans-serif",color:C.text}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'48px',background:`linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%)`,color:'#fff',minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,background:'#fff',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',padding:4,boxSizing:'border-box'}}>
            <img src="/favicon.svg" alt="DIV Design" style={{width:'100%',height:'100%',display:'block',borderRadius:6}}/>
          </div>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:'-0.4px'}}>DIV Design</div>
        </div>
        <div>
          <div style={{fontSize:34,fontWeight:800,lineHeight:1.15,letterSpacing:'-1px',marginBottom:16}}>Le versioning design,<br/>enfin simple.</div>
          <p style={{fontSize:15,opacity:.9,lineHeight:1.6,maxWidth:420}}>Publiez vos maquettes Figma, demandez des reviews, échangez avec les devs — tout est centralisé et tracé.</p>
          <div style={{display:'flex',gap:24,marginTop:32,flexWrap:'wrap'}}>
            {[{i:'version',t:'Versions horodatées'},{i:'msg',t:'Commentaires & reviews'},{i:'target',t:'Roadmap intégrée'}].map(x=>(
              <div key={x.t} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,opacity:.95}}>
                <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n={x.i} s={14} c="#fff"/>
                </div>{x.t}
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,opacity:.7}}>© 2026 DIV Design</div>
      </div>

      <div style={{width:480,background:C.bg,padding:'48px 48px',display:'flex',flexDirection:'column',justifyContent:'center',overflowY:'auto'}}>
        {!keyOk ? (
          <>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:C.bgTint,border:`1px solid ${C.borderSoft}`,borderRadius:999,padding:'5px 12px',fontSize:11.5,fontWeight:600,color:C.primary,alignSelf:'flex-start',marginBottom:16}}>
              <Icon n="lock" s={13} c={C.primary}/> Étape 1 / 2
            </div>
            <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.6px',marginBottom:8}}>Clé d'accès</h1>
            <p style={{color:C.muted,fontSize:13.5,marginBottom:24,lineHeight:1.55}}>Entrez la clé d'accès de votre équipe pour débloquer la connexion Google.</p>

            <Field label="Clé d'accès" value={keyInput} onChange={setKeyInput} type="password" placeholder="Ex: DIV-2026"/>

            {err && <div style={{marginTop:14,padding:'10px 12px',background:C.dangerBg,color:C.danger,borderRadius:8,fontSize:12.5,fontWeight:500,display:'flex',alignItems:'center',gap:8}}>
              <Icon n="alertCircle" s={14} c={C.danger}/>{err}
            </div>}

            <button onClick={validateKey} style={{marginTop:20,background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 8px rgba(81,0,255,0.25)'}}>
              Valider
            </button>

            <div style={{marginTop:20,fontSize:11.5,color:C.muted,lineHeight:1.6}}>
              La clé vous est communiquée par votre administrateur. Elle est stockée de façon sécurisée et peut être modifiée depuis les paramètres admin.
            </div>
          </>
        ) : (
          <>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:C.successBg,border:`1px solid ${C.success}`,borderRadius:999,padding:'5px 12px',fontSize:11.5,fontWeight:600,color:C.success,alignSelf:'flex-start',marginBottom:16}}>
              <Icon n="check" s={13} c={C.success}/> Étape 2 / 2 · Clé validée
            </div>
            <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.6px',marginBottom:8}}>Connexion Google</h1>
            <p style={{color:C.muted,fontSize:13.5,marginBottom:28,lineHeight:1.55}}>
              Connectez-vous avec votre compte Google <strong style={{color:C.text}}>@{ALLOWED_EMAIL_DOMAIN}</strong>.
              Les autres domaines ne sont pas autorisés.
            </p>

            <button onClick={signIn} disabled={loading} style={{background:C.bg,color:'#1f1f1f',border:`1px solid #dadce0`,borderRadius:10,padding:'13px 16px',fontSize:14,fontWeight:600,cursor:loading?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,boxShadow:'0 1px 2px rgba(0,0,0,0.05)',transition:'all .15s',fontFamily:"'Inter','Roboto',sans-serif"}}
              onMouseEnter={e=>!loading && (e.currentTarget.style.background='#f8f9fa')}
              onMouseLeave={e=>!loading && (e.currentTarget.style.background=C.bg)}>
              <GoogleIcon size={18}/>
              {loading ? 'Redirection…' : 'Continuer avec Google'}
            </button>

            {err && <div style={{marginTop:16,padding:'10px 12px',background:C.dangerBg,color:C.danger,borderRadius:8,fontSize:12.5,fontWeight:500,display:'flex',alignItems:'flex-start',gap:8}}>
              <Icon n="alertCircle" s={14} c={C.danger}/><span>{err}</span>
            </div>}

            <button onClick={resetKey} style={{marginTop:20,background:'none',border:'none',color:C.muted,fontSize:12.5,cursor:'pointer',textAlign:'left',padding:0,alignSelf:'flex-start'}}>
              ← Saisir une autre clé
            </button>

            <div style={{marginTop:24,fontSize:11.5,color:C.muted,lineHeight:1.6}}>
              En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité de DIV Design.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────── MAIN APP ────────────────────
export default function App(){
  const [data,setData] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [screen,setScreen] = useState("dash");
  const [pid,setPid] = useState(null);
  const [vid,setVid] = useState(null);
  const [modal,setModal] = useState(null);
  const [form,setForm] = useState({});
  const [cText,setCText] = useState("");
  const [reply,setReply] = useState(null);
  const [search,setSearch] = useState("");
  const [ganttView,setGanttView] = useState('week');
  const [projectsOpen,setProjectsOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const remoteUpdatedRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedRef = useRef('');
  const dataRef = useRef(null);
  const pendingSessionUserRef = useRef(null);
  const handledSessionRef = useRef(false);
  const [authError, setAuthError] = useState('');

  useEffect(()=>{
    let cancelled = false;
    (async () => {
      let initial = null;
      if (hasSupabase) {
        try {
          const cloud = await cloudLoad();
          if (cloud?.data) {
            initial = cloud.data;
            remoteUpdatedRef.current = cloud.updated_at;
          }
        } catch (e) {
          console.warn('[supabase] initial load failed:', e);
        }
      }
      if (!initial) {
        try {
          const raw = localStorage.getItem('divdesign-v1');
          initial = raw ? JSON.parse(raw) : SEED;
        } catch {
          initial = SEED;
        }
      }
      if (cancelled) return;
      const withDefaults = { ...SEED, ...initial };
      setData({ ...withDefaults, currentUserId: null });
      lastSavedRef.current = JSON.stringify(stripSession(withDefaults));
    })();
    return () => { cancelled = true; };
  },[]);

  useEffect(() => { dataRef.current = data; }, [data]);

  // Realtime sync: when another client updates the cloud state, refresh local
  useEffect(() => {
    if (!hasSupabase) return;
    const unsub = cloudSubscribe((newData, updatedAt) => {
      if (remoteUpdatedRef.current === updatedAt) return;
      remoteUpdatedRef.current = updatedAt;
      const serialized = JSON.stringify(stripSession(newData));
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;
      setData(prev => ({ ...newData, currentUserId: prev?.currentUserId ?? null }));
    });
    return unsub;
  }, []);

  const stripSession = d => { const { currentUserId, ...rest } = d; return rest; };

  const save = d => {
    setData(d);
    const persisted = stripSession(d);
    try { localStorage.setItem('divdesign-v1', JSON.stringify(persisted)); } catch {}
    if (!hasSupabase) return;
    const serialized = JSON.stringify(persisted);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const res = await cloudSave(persisted);
      if (res?.ok) remoteUpdatedRef.current = new Date().toISOString();
    }, 400);
  };

  // ──────── Supabase Auth (Google OAuth + domain whitelist) ────────

  const processSignedInUser = async (authUser) => {
    const email = (authUser.email || '').toLowerCase();
    if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      await supabaseSignOut();
      sessionStorage.removeItem('divdesign_keyok');
      handledSessionRef.current = false;
      setAuthError(`Seuls les comptes @${ALLOWED_EMAIL_DOMAIN} sont autorisés.`);
      return;
    }
    const d = dataRef.current;
    if (!d) return;
    const existing = d.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      if (existing.avatarUrl !== authUser.user_metadata?.avatar_url) {
        save({ ...d, users: d.users.map(u => u.id === existing.id ? { ...u, avatarUrl: authUser.user_metadata?.avatar_url || u.avatarUrl, name: authUser.user_metadata?.full_name || u.name } : u) });
      }
      setCurrentUserId(existing.id);
      return;
    }
    const isFirst = d.users.length === 0;
    const user = {
      id: uid(),
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0],
      email,
      role: isFirst ? 'Admin' : 'Membre',
      createdAt: nowISO(),
      provider: 'google',
      avatarUrl: authUser.user_metadata?.avatar_url || null,
    };
    save({ ...d, users: [...d.users, user] });
    setCurrentUserId(user.id);
  };

  useEffect(() => {
    if (!hasSupabase) return;
    const tryProcess = async (session) => {
      if (!session?.user || handledSessionRef.current) return;
      if (!dataRef.current) {
        pendingSessionUserRef.current = session.user;
        return;
      }
      handledSessionRef.current = true;
      await processSignedInUser(session.user);
    };
    getCurrentSession().then(tryProcess);
    const unsub = onAuthChange((event, session) => {
      if (event === 'SIGNED_IN') tryProcess(session);
      else if (event === 'SIGNED_OUT') {
        handledSessionRef.current = false;
        pendingSessionUserRef.current = null;
        setCurrentUserId(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!data || !pendingSessionUserRef.current || handledSessionRef.current) return;
    const u = pendingSessionUserRef.current;
    pendingSessionUserRef.current = null;
    handledSessionRef.current = true;
    processSignedInUser(u);
  }, [data]);

  if(!data) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:C.bgTint,color:C.muted,fontFamily:'Inter,sans-serif'}}>Chargement…</div>;

  const currentUser = data.users.find(u=>u.id===currentUserId);
  if(!currentUser) return <AuthScreen data={data} save={save} authError={authError} setAuthError={setAuthError}/>;

  const userById = id => data.users.find(u=>u.id===id);
  const proj = data.projects.find(p=>p.id===pid);
  const ver = proj?.versions.find(v=>v.id===vid);
  const isAdmin = currentUser.role==='Admin';
  const canCreateVersion = isAdmin || currentUser.role==='Design';
  const canReview = isAdmin || currentUser.role==='Dev';

  const navTo=(s,p=null,v=null)=>{setScreen(s);if(p!==null)setPid(p);if(v!==null)setVid(v);setNotifOpen(false);setUserMenu(false);};
  const logout = async () => {
    if (hasSupabase) await supabaseSignOut();
    sessionStorage.removeItem('divdesign_keyok');
    handledSessionRef.current = false;
    setCurrentUserId(null);
    setScreen('dash');
  };

  // ─── Notifications helpers ───
  const addNotif = (d2, userIds, type, text, projectId, versionId) => {
    const newNotifs = userIds.filter(uid2=>uid2!==currentUser.id).map(uid2 => ({id:uid(),userId:uid2,type,text,createdAt:nowISO(),read:false,projectId,versionId}));
    return {...d2, notifications:[...newNotifs, ...d2.notifications]};
  };
  const markNotifRead = nid => save({...data, notifications: data.notifications.map(n=>n.id===nid?{...n,read:true}:n)});
  const markAllNotifRead = () => save({...data, notifications: data.notifications.map(n=>n.userId===currentUser.id?{...n,read:true}:n)});

  // ─── Project CRUD ───
  const createProject = () => {
    if(!form.name?.trim())return;
    const p = {id:uid(),name:form.name,description:form.desc||'',figmaUrl:form.url||'',color:form.color||PROJECT_COLORS[0],createdAt:nowISO(),ownerId:currentUser.id,versions:[]};
    save({...data,projects:[...data.projects,p]});
    setModal(null);setForm({});
  };
  const editProject = () => {
    save({...data, projects:data.projects.map(p=>p.id===form.id?{...p,name:form.name,description:form.desc||'',figmaUrl:form.url||'',color:form.color||p.color||PROJECT_COLORS[0]}:p)});
    setModal(null);setForm({});
  };
  const deleteProject = id => {
    if(!confirm('Supprimer ce projet et toutes ses versions ?')) return;
    const d2 = {...data, projects:data.projects.filter(p=>p.id!==id), roadmap:data.roadmap.filter(r=>r.projectId!==id)};
    save(d2);
    if(pid===id){setPid(null);setScreen('dash');}
    setModal(null);
  };

  // ─── Version CRUD ───
  const createVersion = () => {
    if(!form.title?.trim())return;
    const project = data.projects.find(p=>p.id===pid);
    if(!project) return;
    const last = project.versions[project.versions.length-1];
    let number = 'v1.0';
    if(last){const m=last.number.match(/v(\d+)\.(\d+)/);number=m?`v${m[1]}.${parseInt(m[2])+1}`:`v1.${project.versions.length}`;}
    const v = {id:uid(),number,title:form.title,description:form.desc||'',figmaUrl:form.url||'',previewUrl:form.previewUrl||'',changelog:form.changelog?form.changelog.split('\n').filter(s=>s.trim()):[],status:form.submitReview?'Review demandée':'Brouillon',createdAt:nowISO(),createdBy:currentUser.id,comments:[]};
    let d2 = {...data, projects:data.projects.map(p=>p.id===project.id?{...p,versions:[...p.versions, v]}:p)};
    d2 = addNotif(d2, data.users.map(u=>u.id), 'version_published', `${currentUser.name} a publié ${number} dans "${project.name}"`, project.id, v.id);
    save(d2);
    setModal(null);setForm({});
  };
  const editVersion = () => {
    save({...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.map(v=>v.id===form.id?{...v,title:form.title,description:form.desc||'',figmaUrl:form.url||'',previewUrl:form.previewUrl||'',changelog:form.changelog?form.changelog.split('\n').filter(s=>s.trim()):[]}:v)}:p)});
    setModal(null);setForm({});
  };
  const deleteVersion = id => {
    if(!confirm('Supprimer cette version ?'))return;
    save({...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.filter(v=>v.id!==id)}:p)});
    if(vid===id){setVid(null);setScreen('proj');}
    setModal(null);
  };
  const setStatus = s => {
    const v = ver;
    let d2 = {...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.map(vv=>vv.id===vid?{...vv,status:s}:vv)}:p)};
    // Notify creator
    if(v.createdBy!==currentUser.id){
      const msg = s==='Approuvée'?`${currentUser.name} a approuvé ${v.number}`
        : s==='Révision requise'?`${currentUser.name} demande une révision de ${v.number}`
        : s==='Review demandée'?`${currentUser.name} a soumis ${v.number} pour review`
        : `Statut de ${v.number} changé : ${s}`;
      const targets = s==='Review demandée' ? data.users.map(u=>u.id) : [v.createdBy];
      d2 = addNotif(d2, targets, s==='Approuvée'?'approved':s==='Révision requise'?'revision':'status', msg, pid, vid);
    }
    save(d2);
  };

  // ─── Comments ───
  const addComment = () => {
    if(!cText.trim())return;
    const c = {id:uid(),authorId:currentUser.id,text:cText,createdAt:nowISO(),resolved:false,replies:[]};
    let d2 = {...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.map(v=>v.id===vid?{...v,comments:[...v.comments,c]}:v)}:p)};
    if(ver.createdBy!==currentUser.id) d2 = addNotif(d2, [ver.createdBy], 'comment', `${currentUser.name} a commenté ${ver.number}`, pid, vid);
    save(d2);
    setCText('');
  };
  const addReply = cid => {
    if(!reply?.text?.trim())return;
    const comment = ver.comments.find(c=>c.id===cid);
    const r = {id:uid(),authorId:currentUser.id,text:reply.text,createdAt:nowISO()};
    let d2 = {...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.map(v=>v.id===vid?{...v,comments:v.comments.map(c=>c.id===cid?{...c,replies:[...c.replies,r]}:c)}:v)}:p)};
    if(comment.authorId!==currentUser.id) d2 = addNotif(d2, [comment.authorId], 'reply', `${currentUser.name} a répondu à votre commentaire`, pid, vid);
    save(d2);
    setReply(null);
  };
  const toggleResolve = cid => save({...data, projects:data.projects.map(p=>p.id===pid?{...p,versions:p.versions.map(v=>v.id===vid?{...v,comments:v.comments.map(c=>c.id===cid?{...c,resolved:!c.resolved}:c)}:v)}:p)});

  // ─── Team management ───
  const changeUserRole = (uid2, role) => save({...data, users:data.users.map(u=>u.id===uid2?{...u,role}:u)});
  const removeUser = uid2 => {
    if(uid2===currentUser.id) return alert("Vous ne pouvez pas vous retirer vous-même.");
    if(!confirm("Retirer cet utilisateur de l'équipe ?"))return;
    save({...data, users:data.users.filter(u=>u.id!==uid2)});
  };

  // ─── Roadmap ───
  const createMilestone = () => {
    if(!form.title?.trim() || !form.dueDate) return;
    const startISO = form.startDate ? new Date(form.startDate).toISOString() : nowISO();
    const m = {id:uid(),title:form.title,description:form.desc||'',startDate:startISO,dueDate:new Date(form.dueDate).toISOString(),projectId:form.projectId||null,createdAt:nowISO(),completed:false};
    save({...data, roadmap:[...data.roadmap, m]});
    setModal(null);setForm({});
  };
  const toggleMilestone = id => save({...data, roadmap:data.roadmap.map(r=>r.id===id?{...r,completed:!r.completed}:r)});
  const deleteMilestone = id => {if(!confirm('Supprimer cette échéance ?'))return;save({...data, roadmap:data.roadmap.filter(r=>r.id!==id)});setModal(null);};

  // ─── Access key ───
  const updateAccessKey = () => {
    if(!form.key?.trim())return;
    save({...data, accessKey:form.key.trim()});
    setModal(null);setForm({});
  };

  // ─── Computed values ───
  const allV = data.projects.flatMap(p=>p.versions);
  const stats = {projects:data.projects.length,versions:allV.length,approved:allV.filter(v=>v.status==='Approuvée').length,pending:allV.filter(v=>v.status==='Review demandée').length,unresolved:allV.flatMap(v=>v.comments).filter(c=>!c.resolved).length};
  const approvalRate = allV.length?Math.round(stats.approved/allV.length*100):0;
  const myNotifs = data.notifications.filter(n=>n.userId===currentUser.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const unreadCount = myNotifs.filter(n=>!n.read).length;

  // ─── Search ───
  const searchQuery = search.trim().toLowerCase();
  const searchResults = (() => {
    if(!searchQuery) return null;
    const projects = [], versions = [], comments = [];
    const match = s => (s||'').toLowerCase().includes(searchQuery);
    const snippet = (t) => {
      if(!t) return '';
      const i = t.toLowerCase().indexOf(searchQuery);
      if(i<0) return t.slice(0,80);
      const start = Math.max(0, i-25), end = Math.min(t.length, i+searchQuery.length+55);
      return (start>0?'…':'') + t.slice(start,end) + (end<t.length?'…':'');
    };
    data.projects.forEach(p => {
      if(match(p.name) || match(p.description)) projects.push(p);
      p.versions.forEach(v => {
        if(match(v.title)||match(v.number)||match(v.description)||(v.changelog||[]).some(match))
          versions.push({...v, projectId:p.id, projectName:p.name, projectColor:p.color});
        v.comments.forEach(c => {
          if(match(c.text)) comments.push({...c, isReply:false, projectId:p.id, versionId:v.id, projectName:p.name, versionNumber:v.number, snippet:snippet(c.text)});
          (c.replies||[]).forEach(r => {
            if(match(r.text)) comments.push({...r, isReply:true, projectId:p.id, versionId:v.id, projectName:p.name, versionNumber:v.number, snippet:snippet(r.text)});
          });
        });
      });
    });
    return { projects, versions, comments, total: projects.length + versions.length + comments.length };
  })();

  const NavItem = ({iconName, label, active, onClick, indent=false, badge}) => (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:10,padding:indent?'7px 10px 7px 32px':'9px 12px',borderRadius:10,cursor:'pointer',background:active?C.bg:'transparent',color:active?C.primary:C.text,fontSize:13.5,fontWeight:active?600:500,marginBottom:2,boxShadow:active?'0 1px 2px rgba(81,0,255,0.08)':'none',transition:'all .15s'}}>
      {iconName && <Icon n={iconName} s={17} c={active?C.primary:C.muted}/>}
      <span style={{flex:1}}>{label}</span>
      {badge>0 && <span style={{background:C.danger,color:'#fff',borderRadius:999,padding:'1px 7px',fontSize:10,fontWeight:700}}>{badge}</span>}
    </div>
  );

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif",background:C.bgTint,color:C.text,overflow:'hidden'}}>

      {/* ─── SIDEBAR ─── */}
      <nav style={{width:252,background:C.bgTint,display:'flex',flexDirection:'column',flexShrink:0,padding:'16px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 8px 18px'}}>
          <Logo size={32}/>
          <div style={{fontSize:16,fontWeight:800,letterSpacing:'-0.3px'}}>DIV Design</div>
        </div>

        {(isAdmin || currentUser.role==='Design') && <button onClick={()=>{setModal({type:'project'});setForm({});}} style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'12px 14px',fontSize:13.5,fontWeight:600,color:C.text,cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:18,boxShadow:'0 1px 2px rgba(0,0,0,0.04)',transition:'all .15s'}}>
          <Icon n="plus" s={16} c={C.primary}/> Nouveau projet
        </button>}

        <div>
          <NavItem iconName="home" label="Dashboard" active={screen==='dash'} onClick={()=>navTo('dash')}/>
          <div onClick={()=>setProjectsOpen(!projectsOpen)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,cursor:'pointer',background:(screen==='proj'||screen==='ver')?C.bg:'transparent',color:(screen==='proj'||screen==='ver')?C.primary:C.text,fontSize:13.5,fontWeight:(screen==='proj'||screen==='ver')?600:500,marginBottom:2,boxShadow:(screen==='proj'||screen==='ver')?'0 1px 2px rgba(81,0,255,0.08)':'none'}}>
            <Icon n="folderOpen" s={17} c={(screen==='proj'||screen==='ver')?C.primary:C.muted}/>
            <span style={{flex:1}}>Projets</span>
            <Icon n={projectsOpen?'chevDown':'chevRight'} s={14} c={C.muted}/>
          </div>
          {projectsOpen && data.projects.map(p=>(
            <NavItem key={p.id} label={p.name} active={pid===p.id&&(screen==='proj'||screen==='ver')} onClick={()=>navTo('proj',p.id)} indent/>
          ))}
          {projectsOpen && data.projects.length===0 && <div style={{padding:'6px 32px',fontSize:12,color:C.muted,fontStyle:'italic'}}>Aucun projet</div>}

          <div style={{height:1,background:C.borderSoft,margin:'12px 4px'}}/>

          <NavItem iconName="users" label="Équipe" active={screen==='team'} onClick={()=>navTo('team')}/>
          <NavItem iconName="target" label="Roadmap" active={screen==='roadmap'} onClick={()=>navTo('roadmap')}/>
        </div>

        <div style={{flex:1}}/>

        {/* Retour au Link Hub */}
        <a href="https://dashboard.dev.divprotocol.com/" target="_blank" rel="noopener noreferrer" style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'11px 14px',fontSize:13.5,fontWeight:600,color:C.text,cursor:'pointer',display:'flex',alignItems:'center',gap:10,boxShadow:'0 1px 2px rgba(0,0,0,0.04)',transition:'all .15s',textDecoration:'none'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.borderSoft;e.currentTarget.style.color=C.text;}}>
          <Icon n="arrowLeft" s={16} c={C.primary}/>
          <span style={{flex:1,textAlign:'left'}}>Retour au link hub</span>
          <Icon n="external" s={13} c={C.muted}/>
        </a>

      </nav>

      {/* ─── MAIN ─── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{background:C.bgTint,padding:'16px 20px 12px 6px',display:'flex',alignItems:'center',gap:14}}>
          <div style={{flex:1,position:'relative'}}>
            <div style={{background:C.bg,borderRadius:12,padding:'10px 14px 10px 16px',display:'flex',alignItems:'center',gap:10,border:`1px solid ${searchResults?C.primary:C.borderSoft}`,transition:'border-color .15s'}}>
              <Icon n="search" s={17} c={searchResults?C.primary:C.muted}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un projet, une version, un commentaire…" style={{flex:1,border:'none',outline:'none',fontSize:13.5,background:'transparent',color:C.text}}/>
              {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:6,display:'flex'}} title="Effacer">
                <Icon n="x" s={14} c={C.muted}/>
              </button>}
            </div>
            {searchResults && <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:C.bg,borderRadius:12,border:`1px solid ${C.borderSoft}`,boxShadow:'0 15px 40px rgba(0,0,0,0.1)',zIndex:55,maxHeight:460,overflowY:'auto'}}>
              {searchResults.total===0 && <div style={{padding:'32px 20px',textAlign:'center',color:C.muted,fontSize:13}}>
                Aucun résultat pour « <strong style={{color:C.text}}>{search}</strong> »
              </div>}
              {searchResults.total>0 && <div style={{padding:'6px 8px 4px',fontSize:11,color:C.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,borderBottom:`1px solid ${C.borderSoft}`,marginBottom:4}}>
                {searchResults.total} résultat{searchResults.total>1?'s':''}
              </div>}
              {searchResults.projects.length>0 && <>
                <div style={{padding:'8px 14px 4px',fontSize:10.5,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Projets</div>
                {searchResults.projects.map(p=>(
                  <div key={'sp'+p.id} onClick={()=>{navTo('proj',p.id);setSearch('');}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{width:30,height:30,borderRadius:7,background:`${p.color||C.primary}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon n="folder" s={15} c={p.color||C.primary}/>
                    </div>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      {p.description && <div style={{fontSize:11.5,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description}</div>}
                    </div>
                    <span style={{fontSize:11,color:C.muted}}>{p.versions.length} version{p.versions.length>1?'s':''}</span>
                  </div>
                ))}
              </>}
              {searchResults.versions.length>0 && <>
                <div style={{padding:'8px 14px 4px',fontSize:10.5,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Versions</div>
                {searchResults.versions.map(v=>(
                  <div key={'sv'+v.id} onClick={()=>{navTo('ver',v.projectId,v.id);setSearch('');}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{width:30,height:30,borderRadius:7,background:C.primarySoft,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon n="version" s={15} c={C.primary}/>
                    </div>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                        <code style={{fontSize:10.5,color:C.primary,background:C.primarySoft,padding:'1px 6px',borderRadius:4}}>{v.number}</code>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</span>
                      </div>
                      <div style={{fontSize:11.5,color:C.muted,display:'flex',alignItems:'center',gap:5}}>
                        <Icon n="folder" s={10} c={v.projectColor||C.muted}/>{v.projectName}
                      </div>
                    </div>
                    <Badge status={v.status} size="sm"/>
                  </div>
                ))}
              </>}
              {searchResults.comments.length>0 && <>
                <div style={{padding:'8px 14px 4px',fontSize:10.5,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Commentaires</div>
                {searchResults.comments.map((c,i)=>{
                  const author = userById(c.authorId);
                  return <div key={'sc'+c.id+i} onClick={()=>{navTo('ver',c.projectId,c.versionId);setSearch('');}} style={{padding:'9px 14px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:10}} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div style={{flexShrink:0,marginTop:2}}>
                      <Icon n={c.isReply?'reply':'msg'} s={16} c={C.muted}/>
                    </div>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:12.5,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.snippet}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                        <strong style={{color:author?RC[author.role]:C.muted}}>{author?.name||'—'}</strong> · {c.versionNumber} · {c.projectName}
                      </div>
                    </div>
                  </div>;
                })}
              </>}
            </div>}
          </div>
          <div style={{position:'relative'}}>
            <button onClick={()=>setNotifOpen(!notifOpen)} style={{width:40,height:40,borderRadius:10,background:C.bg,border:`1px solid ${C.borderSoft}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <Icon n="bell" s={17} c={C.muted}/>
              {unreadCount>0 && <span style={{position:'absolute',top:5,right:5,minWidth:16,height:16,borderRadius:999,background:C.danger,border:`1.5px solid ${C.bgTint}`,color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{unreadCount}</span>}
            </button>
            {notifOpen && <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:380,maxHeight:480,background:C.bg,borderRadius:12,border:`1px solid ${C.borderSoft}`,boxShadow:'0 15px 40px rgba(0,0,0,0.1)',zIndex:50,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.borderSoft}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:700,fontSize:14}}>Notifications</div>
                {unreadCount>0 && <button onClick={markAllNotifRead} style={{background:'none',border:'none',color:C.primary,fontSize:12,fontWeight:600,cursor:'pointer',padding:0}}>Tout marquer lu</button>}
              </div>
              <div style={{overflowY:'auto',flex:1}}>
                {myNotifs.length===0?<div style={{padding:'40px 20px',textAlign:'center',color:C.muted,fontSize:13}}>Aucune notification</div>
                  : myNotifs.slice(0,20).map(n=>{
                  const icon = n.type==='comment'?'msg':n.type==='reply'?'reply':n.type==='approved'?'check':n.type==='revision'?'refresh':n.type==='version_published'?'rocket':'bell';
                  const iconColor = n.type==='approved'?C.success:n.type==='revision'?C.danger:n.type==='version_published'?C.primary:C.muted;
                  return <div key={n.id} onClick={()=>{markNotifRead(n.id);if(n.versionId){navTo('ver',n.projectId,n.versionId);}else if(n.projectId){navTo('proj',n.projectId);}setNotifOpen(false);}} style={{padding:'12px 16px',display:'flex',gap:10,cursor:'pointer',borderBottom:`1px solid ${C.borderSoft}`,background:n.read?'transparent':C.primaryLight,transition:'background .15s'}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${iconColor}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon n={icon} s={14} c={iconColor}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,color:C.text,lineHeight:1.4,marginBottom:2,fontWeight:n.read?400:500}}>{n.text}</div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtRel(n.createdAt)}</div>
                    </div>
                    {!n.read && <div style={{width:7,height:7,borderRadius:'50%',background:C.primary,marginTop:8,flexShrink:0}}/>}
                  </div>;
                })}
              </div>
            </div>}
          </div>
          <div style={{position:'relative'}}>
            <button onClick={()=>setUserMenu(!userMenu)} title={`${currentUser.name} · ${currentUser.role}`} style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:999,padding:'3px 10px 3px 3px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,height:40}}>
              <Avatar user={currentUser} size={32}/>
              <div style={{textAlign:'left',lineHeight:1.15,paddingRight:4}}>
                <div style={{fontSize:12.5,fontWeight:600,color:C.text,whiteSpace:'nowrap'}}>{currentUser.name}</div>
                <div style={{fontSize:10.5,color:RC[currentUser.role],fontWeight:600}}>{currentUser.role}</div>
              </div>
              <Icon n="chevDown" s={14} c={C.muted}/>
            </button>
            {userMenu && <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:240,background:C.bg,borderRadius:12,border:`1px solid ${C.borderSoft}`,boxShadow:'0 15px 40px rgba(0,0,0,0.1)',zIndex:60,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.borderSoft}`,display:'flex',alignItems:'center',gap:10}}>
                <Avatar user={currentUser} size={36}/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.name}</div>
                  <div style={{fontSize:11.5,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.email}</div>
                  <div style={{fontSize:10.5,color:RC[currentUser.role],fontWeight:600,marginTop:1}}>{currentUser.role}</div>
                </div>
              </div>
              <div style={{padding:6}}>
                {isAdmin && <div onClick={()=>{setModal({type:'settings'});setForm({key:data.accessKey});setUserMenu(false);}} style={{padding:'9px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Icon n="settings" s={15} c={C.muted}/>Paramètres admin
                </div>}
                <div onClick={logout} style={{padding:'9px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,color:C.danger}} onMouseEnter={e=>e.currentTarget.style.background=C.dangerBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Icon n="logout" s={15} c={C.danger}/>Déconnexion
                </div>
              </div>
            </div>}
          </div>
        </div>

        <main style={{flex:1,background:C.bg,borderRadius:'16px 0 0 0',padding:'28px 36px',overflowY:'auto'}}>

          {/* ─── DASHBOARD ─── */}
          {screen==='dash' && <div>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:4,letterSpacing:'-0.6px'}}>Dashboard</h1>
            <p style={{color:C.muted,fontSize:13.5,marginBottom:28}}>Bienvenue, {currentUser.name.split(' ')[0]} — voici l'activité de votre espace.</p>

            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:32}}>
              {[
                {l:'Projets',v:stats.projects,c:C.primary,i:'folder'},
                {l:'Versions',v:stats.versions,c:C.info,i:'version'},
                {l:'Approuvées',v:stats.approved,c:C.success,i:'check'},
                {l:'En review',v:stats.pending,c:C.alert,i:'eye'},
                {l:'Questions ouvertes',v:stats.unresolved,c:C.danger,i:'question'},
              ].map(s=>(
                <div key={s.l} style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'14px 16px'}}>
                  <div style={{width:30,height:30,borderRadius:7,background:`${s.c}14`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
                    <Icon n={s.i} s={15} c={s.c}/>
                  </div>
                  <div style={{fontSize:24,fontWeight:800,letterSpacing:'-0.5px'}}>{s.v}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:1}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 style={{fontSize:15,fontWeight:700}}>Projets</h2>
              <span style={{fontSize:12.5,color:C.muted}}>Taux d'approbation : <strong style={{color:C.success}}>{approvalRate}%</strong></span>
            </div>

            {data.projects.length===0 ? <EmptyState icon="folder" title="Aucun projet" desc="Créez votre premier projet pour commencer à versionner vos maquettes." actionLabel={(isAdmin||currentUser.role==='Design')?"+ Nouveau projet":null} onAction={()=>{setModal({type:'project'});setForm({});}}/>
              : <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 0.8fr 40px',gap:12,padding:'12px 20px',fontSize:11.5,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:.5,borderBottom:`1px solid ${C.borderSoft}`}}>
                <div>Nom</div><div>Dernière modification</div><div>Statut</div><div>Versions</div><div></div>
              </div>
              {data.projects.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())).map((p,i,arr)=>{
                const lastV=p.versions[p.versions.length-1];
                const unres=p.versions.flatMap(v=>v.comments).filter(c=>!c.resolved).length;
                const lastDate=lastV?.createdAt||p.createdAt;
                const creator = userById(lastV?.createdBy) || userById(p.ownerId);
                return <div key={p.id} style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 1fr 0.8fr 40px',gap:12,padding:'14px 20px',alignItems:'center',cursor:'pointer',borderBottom:i<arr.length-1?`1px solid ${C.borderSoft}`:'none'}} onClick={()=>navTo('proj',p.id)} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                    <div style={{width:32,height:32,borderRadius:8,background:`${p.color||C.primary}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon n="folder" s={17} c={p.color||C.primary}/>
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      {unres>0 && <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:C.danger,fontWeight:600,marginTop:2}}>
                        <Icon n="alertCircle" s={11}/>{unres} question{unres>1?'s':''} ouverte{unres>1?'s':''}
                      </span>}
                    </div>
                  </div>
                  <div style={{fontSize:13,color:C.muted}}>{fmtD(lastDate)}<div style={{fontSize:11,marginTop:1}}>par {creator?.name||'—'}</div></div>
                  <div>{lastV?<Badge status={lastV.status} size="sm"/>:<span style={{fontSize:12,color:C.muted}}>—</span>}</div>
                  <div style={{fontSize:13,fontWeight:500}}>{p.versions.length}</div>
                  {isAdmin && <div style={{position:'relative'}} onClick={e=>e.stopPropagation()}>
                    <button onClick={e=>{e.stopPropagation();setModal({type:'project-menu',id:p.id});}} style={{background:'none',border:'none',cursor:'pointer',padding:6,borderRadius:6}}>
                      <Icon n="more" s={16} c={C.muted}/>
                    </button>
                    {modal?.type==='project-menu'&&modal?.id===p.id&&<div style={{position:'absolute',top:'100%',right:0,background:C.bg,borderRadius:8,border:`1px solid ${C.borderSoft}`,boxShadow:'0 6px 20px rgba(0,0,0,0.08)',zIndex:20,minWidth:160}}>
                      <div onClick={()=>{setModal({type:'edit-project'});setForm({id:p.id,name:p.name,desc:p.description,url:p.figmaUrl,color:p.color||PROJECT_COLORS[0]});}} style={{padding:'8px 12px',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:8}} onMouseEnter={e=>e.currentTarget.style.background=C.bgTint} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <Icon n="edit" s={13} c={C.muted}/>Renommer
                      </div>
                      <div onClick={()=>deleteProject(p.id)} style={{padding:'8px 12px',fontSize:13,cursor:'pointer',color:C.danger,display:'flex',alignItems:'center',gap:8}} onMouseEnter={e=>e.currentTarget.style.background=C.dangerBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <Icon n="trash" s={13} c={C.danger}/>Supprimer
                      </div>
                    </div>}
                  </div>}
                </div>;
              })}
            </div>}
          </div>}

          {/* ─── PROJECT VIEW ─── */}
          {screen==='proj' && proj && <div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,marginBottom:16,color:C.muted}}>
              <span style={{cursor:'pointer',color:C.primary,fontWeight:500}} onClick={()=>navTo('dash')}>Dashboard</span>
              <Icon n="chevRight" s={13} c={C.border}/>
              <span style={{color:C.text,fontWeight:500}}>{proj.name}</span>
            </div>

            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,gap:20,flexWrap:'wrap'}}>
              <div style={{display:'flex',gap:16,alignItems:'flex-start',flex:1,minWidth:0}}>
                <div style={{width:52,height:52,background:`${proj.color||C.primary}14`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon n="folder" s={26} c={proj.color||C.primary}/>
                </div>
                <div style={{minWidth:0}}>
                  <h1 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.6px',marginBottom:4}}>{proj.name}</h1>
                  <p style={{color:C.muted,fontSize:13.5,marginBottom:8}}>{proj.description||'Aucune description'}</p>
                  {proj.figmaUrl&&<a href={proj.figmaUrl} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:5,color:C.primary,fontSize:12.5,textDecoration:'none',fontWeight:500}}>
                    <Icon n="external" s={13}/>Ouvrir dans Figma
                  </a>}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                {isAdmin && <>
                  <IconBtn icon="edit" variant="outline" onClick={()=>{setModal({type:'edit-project'});setForm({id:proj.id,name:proj.name,desc:proj.description,url:proj.figmaUrl,color:proj.color||PROJECT_COLORS[0]});}} label="Modifier"/>
                  <IconBtn icon="trash" variant="outline" onClick={()=>deleteProject(proj.id)} title="Supprimer le projet"/>
                </>}
                {canCreateVersion && <button onClick={()=>{setModal({type:'version'});setForm({});}} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'10px 18px',fontSize:13.5,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 6px rgba(81,0,255,0.2)'}}>
                  <Icon n="plus" s={15} c="#fff"/>Nouvelle version
                </button>}
              </div>
            </div>

            <h2 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Historique des versions <span style={{color:C.muted,fontWeight:500}}>({proj.versions.length})</span></h2>

            <div>
              {[...proj.versions].reverse().map((v,i,arr)=>{
                const unres = v.comments.filter(c=>!c.resolved).length;
                const creator = userById(v.createdBy);
                return <div key={v.id} style={{display:'flex',gap:14,marginBottom:10}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,paddingTop:18}}>
                    <div style={{width:11,height:11,borderRadius:'50%',background:ST[v.status]?.dot,border:`3px solid ${C.bg}`,boxShadow:`0 0 0 1.5px ${ST[v.status]?.dot}`,flexShrink:0}}/>
                    {i<arr.length-1 && <div style={{width:2,flex:1,minHeight:16,background:C.borderSoft,marginTop:4}}/>}
                  </div>
                  <div onClick={()=>navTo('ver',proj.id,v.id)} style={{flex:1,background:C.bg,border:`1px solid ${vid===v.id?C.primary:C.borderSoft}`,borderRadius:12,padding:'14px 18px',cursor:'pointer',marginBottom:i<arr.length-1?4:0,transition:'border-color .15s',boxShadow:'0 1px 2px rgba(0,0,0,0.02)',display:'flex',gap:14}}>
                    {v.previewUrl && <div style={{width:80,height:80,borderRadius:8,overflow:'hidden',flexShrink:0,border:`1px solid ${C.borderSoft}`,background:C.bgTint}}>
                      <img src={v.previewUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.currentTarget.style.display='none'}/>
                    </div>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6,gap:10,flexWrap:'wrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <code style={{fontSize:11.5,fontWeight:700,color:C.primary,background:C.primarySoft,padding:'3px 9px',borderRadius:6,fontFamily:'ui-monospace,SF Mono,monospace'}}>{v.number}</code>
                          <span style={{fontWeight:600,fontSize:14.5}}>{v.title}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          {unres>0 && <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:C.danger,fontWeight:600}}>
                            <Icon n="alertCircle" s={12}/>{unres}
                          </span>}
                          <Badge status={v.status}/>
                        </div>
                      </div>
                      <p style={{color:C.muted,fontSize:13,marginBottom:8,lineHeight:1.55,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{v.description}</p>
                      <div style={{display:'flex',alignItems:'center',gap:12,fontSize:11.5,color:C.muted,flexWrap:'wrap'}}>
                        <span style={{display:'flex',alignItems:'center',gap:5}}><Avatar user={creator} size={18}/><strong style={{color:creator?RC[creator.role]:C.muted,fontWeight:600}}>{creator?.name}</strong></span>
                        <span style={{display:'flex',alignItems:'center',gap:4}}><Icon n="calendar" s={11}/>{fmt(v.createdAt)}</span>
                        {v.comments.length>0 && <span style={{display:'flex',alignItems:'center',gap:4,color:unres>0?C.danger:C.success}}><Icon n="msg" s={11}/>{v.comments.length}</span>}
                      </div>
                    </div>
                  </div>
                </div>;
              })}
              {proj.versions.length===0 && <EmptyState icon="version" title="Aucune version" desc="Créez la première version de ce projet." actionLabel={canCreateVersion?"+ Nouvelle version":null} onAction={()=>{setModal({type:'version'});setForm({});}}/>}
            </div>
          </div>}

          {/* ─── VERSION VIEW ─── */}
          {screen==='ver' && ver && proj && <div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,marginBottom:16,color:C.muted,flexWrap:'wrap'}}>
              <span style={{cursor:'pointer',color:C.primary,fontWeight:500}} onClick={()=>navTo('dash')}>Dashboard</span>
              <Icon n="chevRight" s={13} c={C.border}/>
              <span style={{cursor:'pointer',color:C.primary,fontWeight:500}} onClick={()=>navTo('proj',proj.id)}>{proj.name}</span>
              <Icon n="chevRight" s={13} c={C.border}/>
              <span style={{color:C.text,fontWeight:500}}>{ver.number}</span>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start'}}>
              <div>
                {/* Preview image */}
                {ver.previewUrl && <div style={{background:C.bgTint,border:`1px solid ${C.borderSoft}`,borderRadius:14,overflow:'hidden',marginBottom:16,maxHeight:380}}>
                  <img src={ver.previewUrl} alt="Aperçu" style={{width:'100%',maxHeight:380,objectFit:'contain',display:'block',background:C.bgTint}} onError={e=>{e.currentTarget.parentElement.style.display='none';}}/>
                </div>}

                <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:14,padding:'22px 24px',marginBottom:18,boxShadow:'0 1px 2px rgba(0,0,0,0.02)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,gap:12,flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                      <code style={{fontSize:12,fontWeight:700,color:C.primary,background:C.primarySoft,padding:'4px 10px',borderRadius:6,fontFamily:'ui-monospace,SF Mono,monospace'}}>{ver.number}</code>
                      <h1 style={{fontSize:20,fontWeight:800,letterSpacing:'-0.4px',margin:0}}>{ver.title}</h1>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <Badge status={ver.status}/>
                      {(isAdmin||ver.createdBy===currentUser.id) && <>
                        <IconBtn icon="edit" variant="ghost" title="Modifier" onClick={()=>{setModal({type:'edit-version'});setForm({id:ver.id,title:ver.title,desc:ver.description,url:ver.figmaUrl,previewUrl:ver.previewUrl,changelog:(ver.changelog||[]).join('\n')});}}/>
                        <IconBtn icon="trash" variant="ghost" title="Supprimer" onClick={()=>deleteVersion(ver.id)}/>
                      </>}
                    </div>
                  </div>

                  <p style={{color:C.muted,fontSize:13.5,lineHeight:1.65,marginBottom:ver.changelog?.length?14:14}}>{ver.description||'Aucune description.'}</p>

                  {/* Changelog */}
                  {ver.changelog?.length>0 && <div style={{background:C.bgTint,borderRadius:10,padding:'14px 16px',marginBottom:14}}>
                    <div style={{fontSize:11.5,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:.5,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                      <Icon n="flag" s={12} c={C.muted}/>Modifications
                    </div>
                    {ver.changelog.map((item,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,marginBottom:6}}>
                        <div style={{width:16,height:16,borderRadius:'50%',background:C.primarySoft,color:C.primary,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                          <Icon n="check" s={10} c={C.primary}/>
                        </div>
                        <span style={{flex:1,lineHeight:1.5}}>{item}</span>
                      </div>
                    ))}
                  </div>}

                  <div style={{display:'flex',alignItems:'center',gap:16,fontSize:12.5,color:C.muted,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`,flexWrap:'wrap'}}>
                    <span style={{display:'flex',alignItems:'center',gap:6}}><Avatar user={userById(ver.createdBy)} size={22}/><span>créé par <strong style={{color:RC[userById(ver.createdBy)?.role]||C.muted,fontWeight:600}}>{userById(ver.createdBy)?.name}</strong></span></span>
                    <span style={{display:'flex',alignItems:'center',gap:5}}><Icon n="calendar" s={12}/>{fmt(ver.createdAt)}</span>
                    {ver.figmaUrl && <a href={ver.figmaUrl} target="_blank" rel="noopener" style={{color:C.primary,textDecoration:'none',display:'flex',alignItems:'center',gap:5,fontWeight:500}}><Icon n="external" s={12}/>Ouvrir Figma</a>}
                  </div>
                </div>

                <h2 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Commentaires & Questions <span style={{color:C.muted,fontWeight:500}}>({ver.comments.length})</span></h2>

                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                  {ver.comments.map(c=>{
                    const isReply = reply?.cid===c.id;
                    const author = userById(c.authorId);
                    return <div key={c.id} style={{background:c.resolved?C.bgTint:C.bg,border:`1px solid ${c.resolved?C.borderSoft:`${C.danger}30`}`,borderLeft:`3px solid ${c.resolved?C.success:C.danger}`,borderRadius:12,padding:'14px 16px',transition:'all .2s'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                        <Avatar user={author} size={30}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                            <span style={{fontSize:13.5,fontWeight:700,color:author?RC[author.role]:C.muted}}>{author?.name}</span>
                            <RoleBadge role={author?.role}/>
                            <span style={{fontSize:11.5,color:C.muted}}>{fmtRel(c.createdAt)}</span>
                            {c.resolved && <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:11,color:C.success,fontWeight:600,background:C.successBg,padding:'2px 7px',borderRadius:999}}><Icon n="check" s={10}/>Résolu</span>}
                          </div>
                          <p style={{fontSize:13.5,color:C.text,lineHeight:1.55,margin:0}}>{c.text}</p>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,marginTop:10,paddingLeft:40,flexWrap:'wrap'}}>
                        <button onClick={()=>setReply(isReply?null:{cid:c.id,text:''})} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.muted,borderRadius:7,padding:'4px 10px',fontSize:11.5,cursor:'pointer',fontWeight:500,display:'inline-flex',alignItems:'center',gap:4}}>
                          <Icon n="reply" s={11}/>Répondre
                        </button>
                        {(isAdmin||ver.createdBy===currentUser.id) && <button onClick={()=>toggleResolve(c.id)} style={{background:'transparent',border:`1px solid ${C.border}`,color:c.resolved?C.danger:C.success,borderRadius:7,padding:'4px 10px',fontSize:11.5,cursor:'pointer',fontWeight:500,display:'inline-flex',alignItems:'center',gap:4}}>
                          {c.resolved?<><Icon n="refresh" s={11}/>Rouvrir</>:<><Icon n="check" s={11}/>Résoudre</>}
                        </button>}
                      </div>
                      {c.replies.length>0 && <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`,paddingLeft:40,display:'flex',flexDirection:'column',gap:10}}>
                        {c.replies.map(r=>{
                          const ra = userById(r.authorId);
                          return <div key={r.id} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                            <Avatar user={ra} size={24}/>
                            <div style={{minWidth:0}}>
                              <span style={{fontSize:12.5,fontWeight:700,color:ra?RC[ra.role]:C.muted}}>{ra?.name} </span>
                              <span style={{fontSize:11,color:C.muted}}>· {fmtRel(r.createdAt)}</span>
                              <p style={{fontSize:12.5,color:C.text,margin:'3px 0 0',lineHeight:1.5}}>{r.text}</p>
                            </div>
                          </div>;
                        })}
                      </div>}
                      {isReply && <div style={{marginTop:12,paddingLeft:40,display:'flex',gap:8}}>
                        <input autoFocus value={reply.text} onChange={e=>setReply({...reply,text:e.target.value})} placeholder="Votre réponse…" onKeyDown={e=>e.key==='Enter'&&addReply(c.id)} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',fontSize:12.5,outline:'none'}}/>
                        <button onClick={()=>addReply(c.id)} style={{background:C.primary,color:'#fff',border:'none',borderRadius:8,padding:'0 14px',fontSize:12.5,cursor:'pointer',fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
                          <Icon n="send" s={12} c="#fff"/>Envoyer
                        </button>
                      </div>}
                    </div>;
                  })}
                  {ver.comments.length===0 && <div style={{background:C.bgTint,border:`1px dashed ${C.border}`,borderRadius:12,padding:'28px 20px',textAlign:'center',color:C.muted,fontSize:13}}>Aucun commentaire pour cette version.</div>}
                </div>

                <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'14px 16px',display:'flex',gap:12}}>
                  <Avatar user={currentUser} size={30}/>
                  <div style={{flex:1}}>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)} placeholder="Poser une question ou laisser un commentaire…" style={{width:'100%',background:'transparent',border:'none',color:C.text,fontSize:13.5,outline:'none',resize:'none',fontFamily:'inherit',lineHeight:1.5,boxSizing:'border-box'}} rows={3}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTop:`1px solid ${C.borderSoft}`}}>
                      <span style={{fontSize:11.5,color:C.muted}}>En tant que <strong style={{color:RC[currentUser.role],fontWeight:600}}>{currentUser.name}</strong></span>
                      <button onClick={addComment} disabled={!cText.trim()} style={{background:cText.trim()?C.primary:C.borderSoft,color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,fontWeight:600,cursor:cText.trim()?'pointer':'not-allowed',display:'inline-flex',alignItems:'center',gap:6,transition:'background .15s'}}>
                        <Icon n="send" s={12} c="#fff"/>Commenter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'16px 18px'}}>
                  <h3 style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:.5,marginBottom:12}}>Actions</h3>
                  {(isAdmin||ver.createdBy===currentUser.id)&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {ver.status==='Brouillon'&&<button onClick={()=>setStatus('Review demandée')} style={{background:`${C.alert}14`,border:`1px solid ${C.alert}30`,color:C.alert,borderRadius:10,padding:'10px 14px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                      <Icon n="send" s={15} c={C.alert}/>Demander une review
                    </button>}
                    {ver.status==='Révision requise'&&<button onClick={()=>setStatus('Review demandée')} style={{background:`${C.alert}14`,border:`1px solid ${C.alert}30`,color:C.alert,borderRadius:10,padding:'10px 14px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                      <Icon n="refresh" s={15} c={C.alert}/>Soumettre à nouveau
                    </button>}
                    {ver.status==='Review demandée'&&<div style={{padding:'10px 12px',background:C.alertBg,borderRadius:8,fontSize:12.5,color:C.alert,fontWeight:600,textAlign:'center'}}>En attente de review…</div>}
                    {ver.status==='Approuvée'&&<div style={{padding:'10px 12px',background:C.successBg,borderRadius:8,fontSize:12.5,color:C.success,fontWeight:600,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Icon n="check" s={13} c={C.success}/>Version approuvée</div>}
                  </div>}
                  {canReview && ver.createdBy!==currentUser.id && ver.status==='Review demandée' && <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button onClick={()=>setStatus('Approuvée')} style={{background:`${C.success}14`,border:`1px solid ${C.success}30`,color:C.success,borderRadius:10,padding:'10px 14px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                      <Icon n="check" s={15} c={C.success}/>Approuver
                    </button>
                    <button onClick={()=>setStatus('Révision requise')} style={{background:`${C.danger}14`,border:`1px solid ${C.danger}30`,color:C.danger,borderRadius:10,padding:'10px 14px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                      <Icon n="refresh" s={15} c={C.danger}/>Demander révision
                    </button>
                  </div>}
                  {!(isAdmin||ver.createdBy===currentUser.id||(canReview&&ver.status==='Review demandée')) && <div style={{padding:'10px 12px',background:C.bgTint,borderRadius:8,fontSize:12.5,color:C.muted,textAlign:'center'}}>Vous pouvez commenter cette version.</div>}
                </div>

                <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'16px 18px'}}>
                  <h3 style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Informations</h3>
                  {[
                    {l:'Numéro',v:ver.number},
                    {l:'Créé par',v:userById(ver.createdBy)?.name,c:RC[userById(ver.createdBy)?.role]},
                    {l:'Date',v:fmtD(ver.createdAt)},
                    {l:'Commentaires',v:ver.comments.length},
                    {l:'Questions ouvertes',v:ver.comments.filter(c=>!c.resolved).length,c:ver.comments.filter(c=>!c.resolved).length>0?C.danger:C.success},
                  ].map((row,i,arr)=><div key={row.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,padding:'8px 0',borderBottom:i<arr.length-1?`1px solid ${C.borderSoft}`:'none'}}>
                    <span style={{color:C.muted}}>{row.l}</span>
                    <span style={{fontWeight:500,color:row.c||C.text}}>{row.v}</span>
                  </div>)}
                </div>

                {proj.versions.filter(v=>v.id!==vid).length>0 && <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,padding:'16px 18px'}}>
                  <h3 style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Autres versions</h3>
                  {proj.versions.filter(v=>v.id!==vid).map((v,i,arr)=>(
                    <div key={v.id} onClick={()=>navTo('ver',proj.id,v.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',cursor:'pointer',borderBottom:i<arr.length-1?`1px solid ${C.borderSoft}`:'none'}}>
                      <code style={{fontSize:10.5,color:C.primary,fontWeight:700,background:C.primarySoft,padding:'2px 6px',borderRadius:4,flexShrink:0}}>{v.number}</code>
                      <span style={{fontSize:12.5,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</span>
                      <Badge status={v.status} size="sm"/>
                    </div>
                  ))}
                </div>}
              </div>
            </div>
          </div>}

          {/* ─── TEAM ─── */}
          {screen==='team' && <div>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
              <div>
                <h1 style={{fontSize:24,fontWeight:800,marginBottom:4,letterSpacing:'-0.6px'}}>Équipe</h1>
                <p style={{color:C.muted,fontSize:13.5}}>Gérez les membres et leurs rôles · {data.users.length} membre{data.users.length>1?'s':''}</p>
              </div>
              {isAdmin && <IconBtn icon="lock" variant="outline" label="Clé d'accès" onClick={()=>{setModal({type:'settings'});setForm({key:data.accessKey});}}/>}
            </div>

            <div style={{background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 2fr 1.2fr 1fr',gap:12,padding:'12px 20px',fontSize:11.5,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:.5,borderBottom:`1px solid ${C.borderSoft}`}}>
                <div>Membre</div><div>Email</div><div>Rôle</div><div style={{textAlign:'right'}}>Actions</div>
              </div>
              {data.users.map((u,i,arr)=>(
                <div key={u.id} style={{display:'grid',gridTemplateColumns:'2fr 2fr 1.2fr 1fr',gap:12,padding:'14px 20px',alignItems:'center',borderBottom:i<arr.length-1?`1px solid ${C.borderSoft}`:'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <Avatar user={u} size={36}/>
                    <div>
                      <div style={{fontSize:13.5,fontWeight:600}}>{u.name} {u.id===currentUser.id && <span style={{fontSize:11,color:C.muted,fontWeight:400}}>(vous)</span>}</div>
                      <div style={{fontSize:11,color:C.muted}}>Depuis {fmtD(u.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:C.muted}}>{u.email}</div>
                  <div>
                    {isAdmin && u.id!==currentUser.id ? 
                      <select value={u.role} onChange={e=>changeUserRole(u.id,e.target.value)} style={{background:`${RC[u.role]}14`,color:RC[u.role],border:`1px solid ${RC[u.role]}30`,borderRadius:999,padding:'3px 10px',fontSize:12,fontWeight:600,cursor:'pointer',outline:'none'}}>
                        <option value="Admin">Admin</option>
                        <option value="Design">Design</option>
                        <option value="Dev">Dev</option>
                        <option value="Membre">Membre</option>
                      </select>
                      : <RoleBadge role={u.role}/>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    {isAdmin && u.id!==currentUser.id && <IconBtn icon="trash" variant="ghost" onClick={()=>removeUser(u.id)} title="Retirer"/>}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && <div style={{marginTop:20,background:C.primaryLight,border:`1px solid ${C.primarySoft}`,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:40,height:40,background:C.bg,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon n="lock" s={18} c={C.primary}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13.5,fontWeight:600,marginBottom:2}}>Inviter un membre</div>
                <div style={{fontSize:12,color:C.muted}}>Partagez la clé d'accès pour qu'il puisse s'inscrire. Clé actuelle : <code style={{background:C.bg,padding:'2px 8px',borderRadius:4,fontSize:11.5,color:C.primary,fontWeight:600}}>{data.accessKey}</code></div>
              </div>
              <button onClick={()=>{setModal({type:'settings'});setForm({key:data.accessKey});}} style={{background:C.primary,color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12.5,fontWeight:600,cursor:'pointer'}}>Modifier la clé</button>
            </div>}
          </div>}

          {/* ─── ROADMAP ─── */}
          {screen==='roadmap' && <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,gap:14,flexWrap:'wrap'}}>
              <div>
                <h1 style={{fontSize:24,fontWeight:800,marginBottom:4,letterSpacing:'-0.6px'}}>Roadmap</h1>
                <p style={{color:C.muted,fontSize:13.5}}>Échéances, livraisons et versions publiées</p>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                {/* View selector */}
                <div style={{display:'inline-flex',background:C.bgTint,borderRadius:10,padding:3,border:`1px solid ${C.borderSoft}`}}>
                  {[{k:'hour',l:'Heure'},{k:'day',l:'Jour'},{k:'week',l:'Semaine'},{k:'month',l:'Mois'}].map(opt=>(
                    <button key={opt.k} onClick={()=>setGanttView(opt.k)} style={{background:ganttView===opt.k?C.bg:'transparent',color:ganttView===opt.k?C.primary:C.muted,border:'none',borderRadius:8,padding:'6px 12px',fontSize:12.5,fontWeight:600,cursor:'pointer',boxShadow:ganttView===opt.k?'0 1px 2px rgba(0,0,0,0.06)':'none',transition:'all .15s'}}>
                      {opt.l}
                    </button>
                  ))}
                </div>
                {(isAdmin||currentUser.role==='Design') && <button onClick={()=>{setModal({type:'milestone'});setForm({startDate:new Date().toISOString().split('T')[0],dueDate:new Date(Date.now()+7*86400000).toISOString().split('T')[0]});}} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'10px 18px',fontSize:13.5,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 6px rgba(81,0,255,0.2)'}}>
                  <Icon n="plus" s={15} c="#fff"/>Nouvelle échéance
                </button>}
              </div>
            </div>

            {/* ── Gantt timeline ── */}
            {(() => {
              const milestones = data.roadmap;
              const versions = data.projects.flatMap(p => p.versions.map(v => ({
                id:v.id, number:v.number, title:v.title, status:v.status,
                createdAt:v.createdAt, projectId:p.id, projectName:p.name,
              })));

              if(milestones.length===0 && versions.length===0)
                return <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <EmptyState icon="target" title="Roadmap vide"
                    desc="Ajoutez votre première échéance ou publiez une version pour voir apparaître la timeline."
                    actionLabel={(isAdmin||currentUser.role==='Design')?"+ Nouvelle échéance":null}
                    onAction={()=>{setModal({type:'milestone'});setForm({startDate:new Date().toISOString().split('T')[0],dueDate:new Date(Date.now()+7*86400000).toISOString().split('T')[0]});}}/>
                </div>;

              // ── Compute time range ──
              const HOUR = 3600000, DAY = 86400000, WEEK = 7*DAY;
              const datePoints = [
                ...milestones.flatMap(m=>[new Date(m.startDate||m.createdAt).getTime(), new Date(m.dueDate).getTime()]),
                ...versions.map(v=>new Date(v.createdAt).getTime()),
                Date.now(),
              ];
              let minT = Math.min(...datePoints);
              let maxT = Math.max(...datePoints);

              // Minimum visible span depends on view
              const MIN_SPAN = { hour:2*DAY, day:14*DAY, week:60*DAY, month:120*DAY }[ganttView];
              if(maxT - minT < MIN_SPAN){
                const mid = (minT + maxT)/2;
                minT = mid - MIN_SPAN/2;
                maxT = mid + MIN_SPAN/2;
              }
              const pad = (maxT - minT) * 0.06;
              const startT = minT - pad;
              const endT = maxT + pad;
              const span = endT - startT;

              // ── Zoom (pixels per millisecond) ──
              const PX_PER_MS = {
                hour: 36 / HOUR,
                day: 80 / DAY,
                week: 160 / WEEK,
                month: 180 / (30*DAY),
              }[ganttView];
              const contentWidth = Math.max(900, span * PX_PER_MS);
              const xPx = t => (t - startT) * PX_PER_MS;

              // ── Markers ──
              const marks = [];
              const c0 = new Date(startT);
              if(ganttView==='hour'){
                c0.setMinutes(0,0,0);
                while(c0.getTime() < endT){
                  marks.push({t:new Date(c0), label:c0.toLocaleString('fr-FR',{hour:'2-digit',minute:'2-digit'}), sub:c0.getHours()===0?c0.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):null, major:c0.getHours()===0});
                  c0.setHours(c0.getHours()+1);
                }
              } else if(ganttView==='day'){
                c0.setHours(0,0,0,0);
                while(c0.getTime() < endT){
                  marks.push({t:new Date(c0), label:c0.toLocaleDateString('fr-FR',{day:'2-digit'}), sub:c0.getDate()===1?c0.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}):null, major:c0.getDate()===1});
                  c0.setDate(c0.getDate()+1);
                }
              } else if(ganttView==='week'){
                c0.setHours(0,0,0,0);
                c0.setDate(c0.getDate() - ((c0.getDay()+6)%7));
                while(c0.getTime() < endT){
                  marks.push({t:new Date(c0), label:c0.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}), sub:null, major:c0.getDate()<=7});
                  c0.setDate(c0.getDate()+7);
                }
              } else {
                c0.setDate(1); c0.setHours(0,0,0,0);
                while(c0.getTime() < endT){
                  marks.push({t:new Date(c0), label:c0.toLocaleDateString('fr-FR',{month:'short'}), sub:c0.getMonth()===0?`${c0.getFullYear()}`:null, major:c0.getMonth()===0});
                  c0.setMonth(c0.getMonth()+1);
                }
              }

              // ── Stagger version flags to avoid overlap ──
              const sortedV = [...versions].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
              const MIN_FLAG_GAP_PX = 180;
              const levelLastX = [];
              sortedV.forEach(v => {
                v._x = xPx(new Date(v.createdAt).getTime());
                let lvl = 0;
                while(lvl<levelLastX.length && v._x - levelLastX[lvl] < MIN_FLAG_GAP_PX) lvl++;
                v._lvl = lvl;
                levelLastX[lvl] = v._x;
              });
              const maxLvl = sortedV.reduce((m,v)=>Math.max(m,v._lvl),0);

              // ── Layout ──
              const LEVEL_H = 28;
              const skyHeight = 80 + maxLvl*LEVEL_H;
              const laneHeight = 42;
              const marksBand = 40;

              const todayX = xPx(Date.now());

              const dateLabel = t => ganttView==='hour'
                ? new Date(t).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
                : fmtD(t);

              return <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
                <div style={{flex:1,background:C.bg,border:`1px solid ${C.borderSoft}`,borderRadius:14,padding:'20px 20px 12px',overflowX:'auto',overflowY:'auto',boxShadow:'0 1px 2px rgba(0,0,0,0.02)',minHeight:0,display:'flex',flexDirection:'column'}}>
                  <div style={{position:'relative',width:contentWidth,flex:1,minHeight:skyHeight + Math.max(3, milestones.length)*laneHeight + marksBand + 12}}>

                    {/* Vertical grid */}
                    {marks.map((m,i)=>{
                      const x = xPx(m.t.getTime());
                      return <div key={'mg'+i} style={{position:'absolute',left:x,top:0,bottom:marksBand,width:1,background:m.major?C.border:C.borderSoft,opacity:m.major?1:.8}}/>;
                    })}

                    {/* Baseline */}
                    <div style={{position:'absolute',left:0,right:0,top:skyHeight,height:2,background:C.border,borderRadius:2,zIndex:2}}/>

                    {/* Today marker (line only) */}
                    {todayX>=0 && todayX<=contentWidth && <div style={{position:'absolute',left:todayX,top:0,bottom:marksBand,width:0,borderLeft:`1.5px dashed ${C.primary}`,opacity:.55,pointerEvents:'none',zIndex:1}}/>}

                    {/* ── Version signals ── */}
                    {sortedV.map(v => {
                      const s = ST[v.status] || ST["Brouillon"];
                      return <div key={v.id} onClick={()=>navTo('ver',v.projectId,v.id)}
                        title={`${v.number} — ${v.title}\n${v.projectName}\n${dateLabel(v.createdAt)}`}
                        style={{position:'absolute',left:v._x,top:0,height:skyHeight+6,transform:'translateX(-50%)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',zIndex:5,paddingTop:v._lvl*LEVEL_H}}>
                        {/* Flag: version number + title merged */}
                        <div style={{background:s.dot,color:'#fff',padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,whiteSpace:'nowrap',boxShadow:`0 2px 8px ${s.dot}66`,display:'inline-flex',alignItems:'center',gap:6,maxWidth:260,overflow:'hidden'}}>
                          <span style={{background:'rgba(255,255,255,0.22)',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:800,flexShrink:0}}>{v.number}</span>
                          <span style={{overflow:'hidden',textOverflow:'ellipsis',fontWeight:600}}>{v.title}</span>
                        </div>
                        {/* Beam */}
                        <div style={{flex:1,width:2,background:`linear-gradient(to bottom, ${s.dot}, ${s.dot}20)`,marginTop:4,borderRadius:2}}/>
                        {/* Base dot */}
                        <div style={{width:11,height:11,borderRadius:'50%',background:s.dot,border:`2px solid ${C.bg}`,boxShadow:`0 0 0 2px ${s.dot}`,marginBottom:-5.5}}/>
                      </div>;
                    })}

                    {/* ── Milestone bars ── */}
                    {milestones.length===0 && <div style={{position:'absolute',left:0,right:0,top:skyHeight+14,textAlign:'center',color:C.muted,fontSize:12.5,fontStyle:'italic'}}>
                      Aucune échéance planifiée
                    </div>}
                    {milestones.map((m,i)=>{
                      const y = skyHeight + 12 + i*laneHeight;
                      const isPast = new Date(m.dueDate) < Date.now();
                      const color = m.completed ? C.success : (isPast ? C.danger : C.alert);
                      const bgColor = m.completed ? C.successBg : (isPast ? C.dangerBg : C.alertBg);
                      const project = m.projectId ? data.projects.find(p=>p.id===m.projectId) : null;
                      const mStart = m.startDate || m.createdAt;
                      let startX = xPx(new Date(mStart).getTime());
                      const endX = xPx(new Date(m.dueDate).getTime());
                      let width = Math.max(16, endX - startX);
                      return <div key={m.id} onClick={()=>setModal({type:'milestone-detail',id:m.id})}
                        title={`${m.title}\n${dateLabel(mStart)} → ${dateLabel(m.dueDate)}${m.completed?' · Terminé':(isPast?' · En retard':'')}`}
                        style={{position:'absolute',left:startX,width:width,top:y,height:30,background:bgColor,border:`1px solid ${color}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',padding:'0 10px',fontSize:12,fontWeight:600,color,overflow:'hidden',gap:6,boxShadow:'0 1px 2px rgba(0,0,0,0.03)'}}>
                        <Icon n={m.completed?'check':'target'} s={12} c={color}/>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{m.title}</span>
                        {project && <span style={{fontSize:10,opacity:.75,whiteSpace:'nowrap',flexShrink:0}}>· {project.name}</span>}
                        <span style={{fontSize:10,opacity:.8,whiteSpace:'nowrap',flexShrink:0,marginLeft:'auto'}}>{dateLabel(m.dueDate)}</span>
                      </div>;
                    })}

                    {/* Marker labels band */}
                    {marks.map((m,i)=>{
                      const x = xPx(m.t.getTime());
                      return <div key={'ml'+i} style={{position:'absolute',left:x,bottom:4,fontSize:10.5,color:m.major?C.text:C.muted,fontWeight:m.major?700:500,padding:'0 4px',textTransform:'capitalize',whiteSpace:'nowrap',lineHeight:1.3,transform:'translateX(2px)'}}>
                        {m.sub && <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{m.sub}</div>}
                        {m.label}
                      </div>;
                    })}

                  </div>
                </div>

                {/* Legend */}
                <div style={{display:'flex',gap:22,marginTop:12,fontSize:12,color:C.muted,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center'}}>
                      <div style={{background:C.primary,color:'#fff',padding:'2px 6px',borderRadius:4,fontSize:9,fontWeight:700,lineHeight:1}}>v1</div>
                      <div style={{width:2,height:10,background:C.primary,marginTop:1}}/>
                    </div>
                    <span>Version publiée — cliquez pour les détails</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:10,borderRadius:3,background:C.alertBg,border:`1px solid ${C.alert}`}}/>En cours
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:10,borderRadius:3,background:C.successBg,border:`1px solid ${C.success}`}}/>Terminé
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:24,height:10,borderRadius:3,background:C.dangerBg,border:`1px solid ${C.danger}`}}/>En retard
                  </div>
                </div>
              </div>;
            })()}
          </div>}

        </main>
      </div>

      {/* ─── MODALS ─── */}
      {modal && modal.type!=='project-menu' && <div style={{position:'fixed',inset:0,background:'rgba(30,20,60,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,backdropFilter:'blur(4px)'}} onClick={()=>{setModal(null);setForm({});}}>
        <div style={{background:C.bg,borderRadius:16,padding:'26px 28px',width:460,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.15)'}} onClick={e=>e.stopPropagation()}>

          {(modal.type==='project'||modal.type==='edit-project') && (() => {
            const selectedColor = form.color || PROJECT_COLORS[0];
            return <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,background:`${selectedColor}14`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',transition:'background .2s'}}>
                  <Icon n="folder" s={20} c={selectedColor}/>
                </div>
                <div>
                  <h2 style={{fontSize:17,fontWeight:800,margin:0}}>{modal.type==='project'?'Nouveau projet':'Modifier le projet'}</h2>
                </div>
              </div>
              <IconBtn icon="x" onClick={()=>{setModal(null);setForm({});}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Field label="Nom du projet *" value={form.name||''} onChange={v=>setForm({...form,name:v})} placeholder="Ex: Refonte du site e-commerce"/>
              <Field label="Description" value={form.desc||''} onChange={v=>setForm({...form,desc:v})} multiline placeholder="Décrivez brièvement le projet…"/>
              <Field label="Lien Figma" value={form.url||''} onChange={v=>setForm({...form,url:v})} placeholder="https://figma.com/file/..."/>
              <div>
                <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:8,fontWeight:500}}>Couleur du projet</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {PROJECT_COLORS.map(col => {
                    const active = selectedColor === col;
                    return <button key={col} type="button" onClick={()=>setForm({...form,color:col})} title={col}
                      style={{width:32,height:32,borderRadius:10,background:col,border:active?`2px solid ${C.text}`:`2px solid transparent`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,boxShadow:active?`0 0 0 2px ${C.bg}, 0 0 0 3px ${col}`:'none',transition:'all .15s'}}>
                      {active && <Icon n="check" s={14} c="#fff"/>}
                    </button>;
                  })}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModal(null);setForm({});}} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:'9px 18px',fontSize:13.5,cursor:'pointer',fontWeight:500}}>Annuler</button>
              <button onClick={modal.type==='project'?createProject:editProject} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'9px 22px',fontSize:13.5,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 6px rgba(81,0,255,0.25)'}}>
                {modal.type==='project'?'Créer':'Enregistrer'}
              </button>
            </div>
            </>;
          })()}

          {(modal.type==='version'||modal.type==='edit-version') && <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,background:C.primarySoft,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n="version" s={20} c={C.primary}/>
                </div>
                <div>
                  <h2 style={{fontSize:17,fontWeight:800,margin:0}}>{modal.type==='version'?'Nouvelle version':'Modifier la version'}</h2>
                  <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Dans "{proj?.name}"</p>
                </div>
              </div>
              <IconBtn icon="x" onClick={()=>{setModal(null);setForm({});}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Field label="Titre *" value={form.title||''} onChange={v=>setForm({...form,title:v})} placeholder="Ex: Ajout du mode sombre"/>
              <Field label="Description" value={form.desc||''} onChange={v=>setForm({...form,desc:v})} multiline placeholder="Contexte général de la version…"/>
              <Field label="Changelog (une ligne par changement)" value={form.changelog||''} onChange={v=>setForm({...form,changelog:v})} multiline placeholder="Nouveau composant button&#10;Refonte de la nav&#10;Correction des espacements"/>
              <Field label="Lien Figma" value={form.url||''} onChange={v=>setForm({...form,url:v})} placeholder="https://figma.com/file/...?node=..."/>
              <Field label="URL de l'aperçu (screenshot)" value={form.previewUrl||''} onChange={v=>setForm({...form,previewUrl:v})} placeholder="https://... .png / .jpg" hint="Collez l'URL d'une image pour visualiser la version."/>
              {modal.type==='version' && <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
                <input type="checkbox" checked={!!form.submitReview} onChange={e=>setForm({...form,submitReview:e.target.checked})} style={{accentColor:C.primary,width:16,height:16}}/>
                Soumettre directement pour review
              </label>}
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModal(null);setForm({});}} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:'9px 18px',fontSize:13.5,cursor:'pointer',fontWeight:500}}>Annuler</button>
              <button onClick={modal.type==='version'?createVersion:editVersion} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'9px 22px',fontSize:13.5,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 6px rgba(81,0,255,0.25)'}}>
                {modal.type==='version'?'Créer la version':'Enregistrer'}
              </button>
            </div>
          </>}

          {modal.type==='milestone' && <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,background:C.primarySoft,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n="target" s={20} c={C.primary}/>
                </div>
                <h2 style={{fontSize:17,fontWeight:800,margin:0}}>Nouvelle échéance</h2>
              </div>
              <IconBtn icon="x" onClick={()=>{setModal(null);setForm({});}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Field label="Titre *" value={form.title||''} onChange={v=>setForm({...form,title:v})} placeholder="Ex: Livraison v2.0"/>
              <Field label="Description" value={form.desc||''} onChange={v=>setForm({...form,desc:v})} multiline placeholder="Détails de l'échéance…"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Field label="Date de début *" value={form.startDate||''} onChange={v=>setForm({...form,startDate:v})} type="date"/>
                <Field label="Date d'échéance *" value={form.dueDate||''} onChange={v=>setForm({...form,dueDate:v})} type="date"/>
              </div>
              <div>
                <label style={{fontSize:12,color:C.muted,display:'block',marginBottom:6,fontWeight:500}}>Projet lié (optionnel)</label>
                <select value={form.projectId||''} onChange={e=>setForm({...form,projectId:e.target.value})} style={{width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 12px',fontSize:13.5,outline:'none',cursor:'pointer'}}>
                  <option value="">Aucun</option>
                  {data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModal(null);setForm({});}} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:'9px 18px',fontSize:13.5,cursor:'pointer',fontWeight:500}}>Annuler</button>
              <button onClick={createMilestone} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'9px 22px',fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Créer l'échéance</button>
            </div>
          </>}

          {modal.type==='milestone-detail' && (() => {
            const m = data.roadmap.find(r=>r.id===modal.id);
            if(!m) return null;
            const project = m.projectId?data.projects.find(p=>p.id===m.projectId):null;
            return <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,background:m.completed?C.successBg:C.primarySoft,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Icon n={m.completed?'check':'target'} s={20} c={m.completed?C.success:C.primary}/>
                  </div>
                  <div>
                    <h2 style={{fontSize:17,fontWeight:800,margin:0}}>{m.title}</h2>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{fmtD(m.startDate||m.createdAt)} → {fmtD(m.dueDate)}</div>
                  </div>
                </div>
                <IconBtn icon="x" onClick={()=>setModal(null)}/>
              </div>
              {m.description && <p style={{color:C.text,fontSize:13.5,lineHeight:1.6,marginBottom:14}}>{m.description}</p>}
              {project && <div onClick={()=>{setModal(null);navTo('proj',project.id);}} style={{background:C.bgTint,border:`1px solid ${C.borderSoft}`,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:14}}>
                <Icon n="folder" s={18} c={project.color||C.primary}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:C.muted}}>Projet lié</div>
                  <div style={{fontSize:13.5,fontWeight:600}}>{project.name}</div>
                </div>
                <Icon n="chevRight" s={14} c={C.muted}/>
              </div>}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:10,borderTop:`1px solid ${C.borderSoft}`,marginTop:10}}>
                {isAdmin && <button onClick={()=>deleteMilestone(m.id)} style={{background:C.dangerBg,border:'none',color:C.danger,borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <Icon n="trash" s={13} c={C.danger}/>Supprimer
                </button>}
                <button onClick={()=>{toggleMilestone(m.id);setModal(null);}} style={{background:m.completed?C.bg:C.success,border:`1px solid ${m.completed?C.border:'transparent'}`,color:m.completed?C.text:'#fff',borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  {m.completed?'Marquer en cours':'Marquer terminé'}
                </button>
              </div>
            </>;
          })()}

          {modal.type==='settings' && <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,background:C.primarySoft,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon n="lock" s={20} c={C.primary}/>
                </div>
                <div>
                  <h2 style={{fontSize:17,fontWeight:800,margin:0}}>Clé d'accès</h2>
                  <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>Requise pour créer un compte</p>
                </div>
              </div>
              <IconBtn icon="x" onClick={()=>{setModal(null);setForm({});}}/>
            </div>
            <Field label="Clé d'accès actuelle" value={form.key||''} onChange={v=>setForm({...form,key:v})} placeholder="Ex: DIV-2026" hint="Partagez cette clé avec les futurs membres pour qu'ils s'inscrivent."/>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModal(null);setForm({});}} style={{background:'transparent',border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:'9px 18px',fontSize:13.5,cursor:'pointer',fontWeight:500}}>Annuler</button>
              <button onClick={updateAccessKey} style={{background:C.primary,color:'#fff',border:'none',borderRadius:10,padding:'9px 22px',fontSize:13.5,fontWeight:600,cursor:'pointer'}}>Mettre à jour</button>
            </div>
          </>}
        </div>
      </div>}

      {/* Close project menu on outside click */}
      {modal?.type==='project-menu' && <div style={{position:'fixed',inset:0,zIndex:10}} onClick={()=>setModal(null)}/>}

    </div>
  );
}
