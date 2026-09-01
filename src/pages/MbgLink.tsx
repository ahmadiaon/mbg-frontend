import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import '../mbg-link.css';

// ===== TYPES =====
interface Comment {
  author: string;
  initial: string;
  body: string;
  replies: Comment[];
}
interface Post {
  id: number;
  author: string;
  initial: string;
  nrp: string;
  time: string;
  company: string;
  project: string;
  department: string;
  jenis: string;
  title: string;
  body: string;
  likes: number;
  comments: Comment[];
}
interface Employee {
  nrp: string;
  name: string;
  initial: string;
  department: string;
  position: string;
  company: string;
}
interface AttendanceItem {
  name: string;
  initial: string;
  time: string;
  status: string;
}
interface DocItem {
  name: string;
  title: string;
}

// ===== DUMMY DATA =====
const MASTER = {
  companies: ['PT Mitra Barito Group', 'PT SRI', 'PT MB', 'PT Energi Transport'],
  projects: ['Project A', 'Project B', 'Project C'],
  departments: ['HRGA', 'Produksi', 'Maintenance', 'Safety', 'MIS'],
  jenis: [
    'Laporan Harian', 'P5M', 'K3', 'Maintenance', 'Produksi',
    'Inventori', 'Informasi', 'Dokumentasi', 'Absensi',
  ],
};

const EMPLOYEES: Employee[] = [
  { nrp: 'MBLE-0422003', name: 'Ahmadi', initial: 'AK', department: 'MIS', position: 'Senior Officer MIS', company: 'PT Mitra Barito Group' },
  { nrp: 'MBLE-0321120046', name: 'Budi Santoso', initial: 'BS', department: 'Produksi', position: 'Supervisor Produksi', company: 'PT MB' },
  { nrp: 'MBLE-05230170', name: 'Dewi Sartika', initial: 'DS', department: 'Safety', position: 'Safety Officer', company: 'PT SRI' },
  { nrp: 'MBL-130108', name: 'Siti Nurhaliza', initial: 'SN', department: 'HRGA', position: 'Staff HRGA', company: 'PT Mitra Barito Group' },
];

const ATTENDANCE: AttendanceItem[] = [
  { name: 'Ahmadi', initial: 'AK', time: '07:21', status: 'Masuk' },
  { name: 'Budi Santoso', initial: 'BS', time: '07:25', status: 'Masuk' },
  { name: 'Dewi Sartika', initial: 'DS', time: '07:29', status: 'Masuk' },
  { name: 'Siti Nurhaliza', initial: 'SN', time: '07:34', status: 'Masuk' },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 1, author: 'Ahmadi', initial: 'AK', nrp: 'MBLE-0422003', time: '08:41',
    company: 'PT Mitra Barito Group', project: 'Project A', department: 'MIS',
    jenis: 'Laporan Harian', title: 'Monitoring Sistem MBG-Link',
    body: 'Monitoring sistem MBG-Link berjalan normal. Beberapa fitur sedang dalam tahap pengembangan.',
    likes: 12,
    comments: [
      { author: 'Budi Santoso', initial: 'BS', body: 'Siap, terima kasih informasinya.', replies: [] },
    ],
  },
  {
    id: 2, author: 'Dewi Sartika', initial: 'DS', nrp: 'MBLE-05230170', time: '09:12',
    company: 'PT SRI', project: 'Project B', department: 'Safety',
    jenis: 'P5M', title: 'Kegiatan P5M Pagi Ini',
    body: 'Dokumentasi kegiatan P5M sebelum pekerjaan dimulai.',
    likes: 18, comments: [],
  },
  {
    id: 3, author: 'Budi Santoso', initial: 'BS', nrp: 'MBLE-0321120046', time: '10:15',
    company: 'PT MB', project: 'Project C', department: 'Produksi',
    jenis: 'Produksi', title: 'Progress Produksi Harian',
    body: 'Progress produksi hari ini berjalan sesuai target.',
    likes: 7,
    comments: [
      {
        author: 'Siti Nurhaliza', initial: 'SN', body: 'Target hari ini berapa?',
        replies: [
          { author: 'Budi Santoso', initial: 'BS', body: 'Target sementara 1.200 ton.', replies: [] },
        ],
      },
    ],
  },
];

type Tab = 'home' | 'report' | 'attendance' | 'employees' | 'documentation';

const MENU: { key: Tab; icon: string; label: string }[] = [
  { key: 'home', icon: 'bi-house-fill', label: 'Beranda' },
  { key: 'report', icon: 'bi-megaphone-fill', label: 'Laporan' },
  { key: 'attendance', icon: 'bi-fingerprint', label: 'Absensi' },
  { key: 'employees', icon: 'bi-people-fill', label: 'Karyawan' },
  { key: 'documentation', icon: 'bi-book', label: 'Dokumentasi' },
];

export default function MbgLink() {
  const [tab, setTab] = useState<Tab>('home');
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  const [fCompany, setFCompany] = useState('');
  const [fProject, setFProject] = useState('');
  const [fDepartment, setFDepartment] = useState('');
  const [fJenis, setFJenis] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [pJenis, setPJenis] = useState('');
  const [pCompany, setPCompany] = useState('');
  const [pProject, setPProject] = useState('');
  const [pTitle, setPTitle] = useState('');
  const [pBody, setPBody] = useState('');

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');

  useEffect(() => {
    api<{ success: boolean; data: DocItem[] }>('/docs')
      .then((r) => setDocs(r.data))
      .catch(() => setDocs([]));
  }, []);

  async function openDoc(doc: DocItem) {
    setDocName(doc.name);
    setDocContent('');
    try {
      const r = await api<{ success: boolean; content: string }>(`/docs/${doc.name}`);
      setDocContent(r.content);
    } catch {
      setDocContent('Gagal memuat dokumentasi.');
    }
  }

  function likePost(id: number) {
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, likes: x.likes + 1 } : x)));
  }

  function addComment(postId: number, body: string) {
    if (!body.trim()) return;
    setPosts((p) =>
      p.map((x) =>
        x.id === postId
          ? {
              ...x,
              comments: [
                ...x.comments,
                { author: 'Ahmadi', initial: 'AK', body: body.trim(), replies: [] },
              ],
            }
          : x,
      ),
    );
  }

  function createPost() {
    if (!pJenis || !pCompany || !pProject || !pTitle.trim() || !pBody.trim()) {
      alert('Jenis, perusahaan, project, judul dan isi wajib diisi.');
      return;
    }
    setPosts((p) => [
      {
        id: Date.now(),
        author: 'Ahmadi',
        initial: 'AK',
        nrp: 'MBLE-0422003',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        company: pCompany,
        project: pProject,
        department: 'MIS',
        jenis: pJenis,
        title: pTitle.trim(),
        body: pBody.trim(),
        likes: 0,
        comments: [],
      },
      ...p,
    ]);
    setShowModal(false);
    setPJenis('');
    setPCompany('');
    setPProject('');
    setPTitle('');
    setPBody('');
  }

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (!fCompany || p.company === fCompany) &&
          (!fProject || p.project === fProject) &&
          (!fDepartment || p.department === fDepartment) &&
          (!fJenis || p.jenis === fJenis),
      ),
    [posts, fCompany, fProject, fDepartment, fJenis],
  );

  return (
    <div className="mbg-link-page">
      <nav className="mbg-navbar">
        <div className="mbg-navbar-inner">
          <a href="/mbg-link" className="mbg-brand">
            <div className="mbg-logo">
              <i className="bi bi-link-45deg"></i>
            </div>
            <span>MBG-Link</span>
          </a>

          <div className="mbg-search">
            <div className="mbg-search-wrapper">
              <i className="bi bi-search"></i>
              <input type="text" className="form-control" placeholder="Cari di MBG-Link..." />
            </div>
          </div>

          <div className="mbg-nav-user">
            <button className="btn btn-light rounded-circle">
              <i className="bi bi-bell"></i>
            </button>
            <div className="mbg-avatar">AK</div>
          </div>
        </div>
      </nav>

      <div className="mbg-container">
        <div className="mbg-layout">
          {/* LEFT SIDEBAR */}
          <aside className="mbg-sidebar">
            <div className="mbg-menu">
              <div className="mbg-menu-title">MBG-Link</div>
              {MENU.map((m) => (
                <button
                  key={m.key}
                  className={`mbg-menu-item ${tab === m.key ? 'active' : ''}`}
                  onClick={() => setTab(m.key)}
                >
                  <i className={`bi ${m.icon}`}></i>
                  <span>{m.label}</span>
                </button>
              ))}
              <div className="mbg-menu-title">Lainnya</div>
              <button className="mbg-menu-item">
                <i className="bi bi-folder2-open"></i>
                <span>Dokumentasi Pekerjaan</span>
              </button>
              <button className="mbg-menu-item">
                <i className="bi bi-gear"></i>
                <span>Pengaturan</span>
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <main>
            {tab === 'home' && (
              <>
                <div className="mbg-card">
                  <div className="create-post">
                    <div className="create-post-top">
                      <div className="mbg-avatar">AK</div>
                      <input
                        type="text"
                        className="create-input"
                        placeholder="Apa yang ingin Anda laporkan?"
                        readOnly
                        onClick={() => setShowModal(true)}
                      />
                    </div>
                    <div className="post-actions">
                      <button className="post-action" onClick={() => setShowModal(true)}>
                        <i className="bi bi-image text-success"></i> Foto
                      </button>
                      <button className="post-action" onClick={() => setShowModal(true)}>
                        <i className="bi bi-megaphone text-primary"></i> Laporan
                      </button>
                      <button className="post-action" onClick={() => setShowModal(true)}>
                        <i className="bi bi-file-earmark-text text-danger"></i> Dokumen
                      </button>
                    </div>
                  </div>
                </div>

                <div className="filter-bar">
                  <div className="filter-scroll">
                    <select className="form-control" value={fCompany} onChange={(e) => setFCompany(e.target.value)}>
                      <option value="">Semua Perusahaan</option>
                      {MASTER.companies.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select className="form-control" value={fProject} onChange={(e) => setFProject(e.target.value)}>
                      <option value="">Semua Project</option>
                      {MASTER.projects.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select className="form-control" value={fDepartment} onChange={(e) => setFDepartment(e.target.value)}>
                      <option value="">Semua Departemen</option>
                      {MASTER.departments.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <select className="form-control" value={fJenis} onChange={(e) => setFJenis(e.target.value)}>
                      <option value="">Semua Jenis</option>
                      {MASTER.jenis.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 && (
                  <div className="alert alert-info">Tidak ada postingan sesuai filter.</div>
                )}
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} onLike={likePost} onComment={addComment} />
                ))}
              </>
            )}

            {tab === 'report' && (
              <div className="mbg-card">
                <div className="mbg-card-body">
                  <h5 className="fw-bold">
                    <i className="bi bi-megaphone-fill text-primary me-2"></i>Laporan Pekerjaan
                  </h5>
                  <p className="text-muted">Semua laporan pekerjaan MBG-Link.</p>
                  {posts.map((post) => (
                    <div key={post.id} className="border-bottom py-3">
                      <div className="d-flex justify-content-between">
                        <strong>{post.title}</strong>
                        <span className="badge bg-success">Dibuka</span>
                      </div>
                      <small className="text-muted">
                        {post.author} • {post.company} • {post.project}
                      </small>
                      <div className="mt-1">{post.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'attendance' && (
              <div className="mbg-card">
                <div className="mbg-card-body">
                  <h5 className="fw-bold">
                    <i className="bi bi-fingerprint text-primary me-2"></i>Absensi Hari Ini
                  </h5>
                  <div className="row g-2 mt-3">
                    <div className="col-4">
                      <div className="rounded p-3 text-center" style={{ background: '#d1e7dd' }}>
                        <strong className="fs-4">4</strong>
                        <div className="small">Hadir</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="rounded p-3 text-center" style={{ background: '#fff3cd' }}>
                        <strong className="fs-4">0</strong>
                        <div className="small">Terlambat</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="rounded p-3 text-center" style={{ background: '#f8d7da' }}>
                        <strong className="fs-4">0</strong>
                        <div className="small">Belum Hadir</div>
                      </div>
                    </div>
                  </div>
                  <hr />
                  {ATTENDANCE.map((a) => (
                    <div className="attendance-item" key={a.initial}>
                      <div className="mbg-avatar mbg-avatar-sm">{a.initial}</div>
                      <div>
                        <strong>{a.name}</strong>
                        <div className="small text-muted">Fingerprint</div>
                      </div>
                      <div className="attendance-time">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {a.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'employees' && (
              <div className="mbg-card">
                <div className="mbg-card-body">
                  <h5 className="fw-bold">
                    <i className="bi bi-people-fill text-primary me-2"></i>Karyawan
                  </h5>
                  <div className="row g-2 mt-3">
                    {EMPLOYEES.map((e) => (
                      <div className="col-md-6" key={e.nrp}>
                        <div className="border rounded p-3">
                          <div className="d-flex gap-2">
                            <div className="mbg-avatar">{e.initial}</div>
                            <div>
                              <strong>{e.name}</strong>
                              <div className="small text-muted">{e.nrp}</div>
                              <div className="small">{e.position}</div>
                              <div className="small text-muted">
                                {e.department} • {e.company}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'documentation' && (
              <div className="mbg-card">
                <div className="mbg-card-body">
                  <h5 className="fw-bold">
                    <i className="bi bi-book text-primary me-2"></i>Dokumentasi MBG-Link
                  </h5>
                  <p className="text-muted">Dokumentasi sistem dan panduan penggunaan.</p>

                  {!docName && (
                    <div>
                      {docs.map((d) => (
                        <div className="documentation-item" key={d.name} onClick={() => openDoc(d)}>
                          <div className="d-flex gap-3">
                            <i className="bi bi-file-earmark-text fs-4"></i>
                            <div>
                              <strong>{d.title}</strong>
                              <div className="small text-muted">Buka dokumentasi</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {docs.length === 0 && <p className="text-muted">Memuat dokumentasi…</p>}
                    </div>
                  )}

                  {docName && (
                    <div>
                      <button className="btn btn-sm btn-light mb-3" onClick={() => setDocName('')}>
                        <i className="bi bi-arrow-left me-1"></i>Kembali
                      </button>
                      <div className="doc-content">
                        {docContent ? (
                          <ReactMarkdown>{docContent}</ReactMarkdown>
                        ) : (
                          <p className="text-muted">Memuat…</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="mbg-right">
            <div className="mbg-widget">
              <div className="mbg-widget-title">
                <i className="bi bi-circle-fill text-success small"></i> Karyawan Online
              </div>
              {EMPLOYEES.map((e) => (
                <div className="online-user" key={e.nrp}>
                  <div className="mbg-avatar mbg-avatar-sm">{e.initial}</div>
                  <div>
                    <strong className="small">{e.name}</strong>
                    <div className="small text-muted">{e.department}</div>
                  </div>
                  <span className="online-dot ms-auto"></span>
                </div>
              ))}
            </div>

            <div className="mbg-widget">
              <div className="mbg-widget-title">
                <i className="bi bi-fingerprint me-1"></i> Absensi Terbaru
              </div>
              {ATTENDANCE.map((a) => (
                <div className="attendance-item" key={a.initial}>
                  <div className="mbg-avatar mbg-avatar-sm">{a.initial}</div>
                  <div>
                    <strong>{a.name}</strong>
                    <div className="small text-muted">{a.status}</div>
                  </div>
                  <div className="attendance-time">{a.time}</div>
                </div>
              ))}
            </div>

            <div className="mbg-widget">
              <div className="mbg-widget-title">
                <i className="bi bi-book me-1"></i> Dokumentasi
              </div>
              <div className="small text-muted">
                Dokumentasi sistem MBG-Link dapat diakses oleh seluruh user untuk sementara.
              </div>
              <button className="btn btn-sm btn-outline-primary mt-3 w-100" onClick={() => setTab('documentation')}>
                Buka Dokumentasi
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* CREATE POST MODAL */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded p-4"
            style={{ width: '100%', maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="fw-bold mb-3">
              <i className="bi bi-pencil-square me-2"></i>Buat Postingan
            </h5>
            <div className="mb-3">
              <label className="form-label">Jenis</label>
              <select className="form-control" value={pJenis} onChange={(e) => setPJenis(e.target.value)}>
                <option value="">Pilih jenis</option>
                {MASTER.jenis.map((j) => <option key={j}>{j}</option>)}
              </select>
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <select className="form-control" value={pCompany} onChange={(e) => setPCompany(e.target.value)}>
                  <option value="">Perusahaan</option>
                  {MASTER.companies.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <select className="form-control" value={pProject} onChange={(e) => setPProject(e.target.value)}>
                  <option value="">Project</option>
                  {MASTER.projects.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3 mt-2">
              <input type="text" className="form-control" placeholder="Judul postingan" value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
            </div>
            <div className="mb-3">
              <textarea className="form-control" rows={5} placeholder="Tulis laporan atau informasi pekerjaan..." value={pBody} onChange={(e) => setPBody(e.target.value)} />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={createPost}>
                <i className="bi bi-send me-1"></i>Posting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== POST CARD =====
function PostCard({
  post,
  onLike,
  onComment,
}: {
  post: Post;
  onLike: (id: number) => void;
  onComment: (id: number, body: string) => void;
}) {
  const [commentInput, setCommentInput] = useState('');

  function submitComment() {
    onComment(post.id, commentInput);
    setCommentInput('');
  }

  return (
    <article className="mbg-card">
      <div className="mbg-card-body">
        <div className="post-header">
          <div className="post-author">
            <div className="mbg-avatar">{post.initial}</div>
            <div>
              <div className="post-author-name">{post.author}</div>
              <div className="post-meta">{post.nrp} • {post.time}</div>
            </div>
          </div>
          <button className="btn btn-sm btn-light">
            <i className="bi bi-three-dots"></i>
          </button>
        </div>

        <div className="post-tags">
          <span className="post-type"><i className="bi bi-tag me-1"></i>{post.jenis}</span>
          <span className="post-tag"><i className="bi bi-building me-1"></i>{post.company}</span>
          <span className="post-tag"><i className="bi bi-kanban me-1"></i>{post.project}</span>
          <span className="post-tag"><i className="bi bi-diagram-3 me-1"></i>{post.department}</span>
        </div>

        <div className="post-title">{post.title}</div>
        <div className="post-body">{post.body}</div>

        <div className="post-stats">
          <span>👍 {post.likes}</span>
          <span>{post.comments.length} komentar</span>
        </div>

        <div className="post-buttons">
          <button onClick={() => onLike(post.id)}>
            <i className="bi bi-hand-thumbs-up me-1"></i>Suka
          </button>
          <button>
            <i className="bi bi-chat-left-text me-1"></i>Komentar
          </button>
          <button>
            <i className="bi bi-share me-1"></i>Bagikan
          </button>
        </div>
      </div>

      <div className="comments">
        {post.comments.map((c, i) => (
          <CommentItem comment={c} key={i} />
        ))}

        <div className="d-flex gap-2 mt-3">
          <div className="mbg-avatar mbg-avatar-sm">AK</div>
          <input
            type="text"
            className="form-control"
            placeholder="Tulis komentar..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitComment();
            }}
          />
        </div>
      </div>
    </article>
  );
}

function CommentItem({ comment, reply = false }: { comment: Comment; reply?: boolean }) {
  return (
    <div className={`comment ${reply ? 'reply' : ''}`}>
      <div className="mbg-avatar mbg-avatar-sm">{comment.initial}</div>
      <div>
        <div className="comment-content">
          <div className="comment-name">{comment.author}</div>
          <div className="comment-text">{comment.body}</div>
        </div>
        <div className="comment-actions">
          <span>Balas</span> · <span>Suka</span>
        </div>
        {comment.replies.map((r, i) => (
          <CommentItem comment={r} reply key={i} />
        ))}
      </div>
    </div>
  );
}
