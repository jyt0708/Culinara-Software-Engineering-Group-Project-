import { Link } from 'react-router-dom'
import { useState } from 'react'

const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const RED = '#c25450'

const btn = (bg, color, extra = {}) => ({
  background: bg, color, borderRadius: 8,
  padding: '0.52rem 1.2rem', fontWeight: 600, fontSize: '0.92rem',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
  border: '1px solid transparent', ...extra,
})

const FEATURES = [
  {
    label: 'Recipe', to: '/recipes', title: 'Recipe Library',
    desc: 'Browse cuisines, save your favorite dishes, and follow clear cooking instructions from the community.',
    link: 'View recipes',
    bg: `linear-gradient(135deg,rgba(232,122,58,.9),rgba(255,208,137,.68)),url("https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80")center/cover`,
  },
  {
    label: 'Forum', to: '/forum', title: 'Cooking Forum',
    desc: 'Ask questions, discuss techniques, share recipe versions, and learn from other home cooks.',
    link: 'Join discussion',
    bg: `linear-gradient(135deg,rgba(80,128,107,.9),rgba(104,151,132,.68)),url("https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80")center/cover`,
  },
  {
    label: 'Market', to: '/products', title: 'Marketplace',
    desc: 'Find ingredients, tools, and cooking products connected to recipes and trusted community recommendations.',
    link: 'Visit marketplace',
    bg: `linear-gradient(135deg,rgba(106,168,216,.9),rgba(246,180,95,.72)),url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80")center/cover`,
  },
]


const FAQS = [
  { q: 'Can I create my own recipe?', a: 'Only approved creators can publish recipes. Regular users can browse and discuss recipes.' },
  { q: 'I have a question about a recipe?', a: 'Each recipe can link to a forum discussion where users can ask questions and share their own version.' },
  { q: 'Can I browse the recipes without a subscription?', a: 'Every registered user can view two recipes for free. The free views are reset after 24 hours.' },
  { q: 'How are payments processed?', a: 'Marketplace purchases can be handled through PayPal so buyers and sellers have a clear payment flow.' },

]

export default function HomePage() {
  //记录第几个问题是展开的
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: '#fafafa', color: '#1a1a1a', lineHeight: 1.55 }}>

      {/* Hero */}
      <header style={{
        minHeight: 570, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '5.5rem 1.5rem', color: '#fff',
        backgroundImage: `linear-gradient(180deg,rgba(24,20,16,.54),rgba(24,20,16,.42)),url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80")`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ width: 'min(760px,100%)' }}>
          <h1 style={{ fontSize: 'clamp(2.6rem,5vw,4.8rem)', lineHeight: 1.05, fontWeight: 800, marginBottom: '1rem' }}>
            Cook, Share, and Discover Together
          </h1>
          <p style={{ maxWidth: 660, margin: '0 auto', fontSize: '1.12rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.92)' }}>
            Culinara brings recipes, food discussions, and trusted cooking supplies into one community for home cooks.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.9rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link to="/recipes" style={btn(GREEN, '#fff')}>Explore Recipes</Link>
            <Link to="/products" style={btn('rgba(255,255,255,0.08)', '#fff', { borderColor: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(4px)' })}>
              Buy Ingredients &amp; Tools
            </Link>
            <Link to="/apply" style={btn(RED, '#fff')}>Become a Creator</Link>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: GREEN_DARK, marginBottom: '0.75rem' }}>
          A Place to <span style={{ color: GREEN }}>Cook Together</span>
        </h2>
        <p style={{ color: '#5f6763', fontSize: '1.04rem', lineHeight: 1.7 }}>
          Find step-by-step recipes, ask questions in the forum, and discover marketplace items recommended by the cooks who use them.
        </p>
      </section>

      {/* Feature Cards */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 1.5rem 4rem', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '1.25rem' }}>
        {FEATURES.map((f) => (
          <Link key={f.label} to={f.to} style={{
            minHeight: 260, background: '#fff', border: '1.5px solid #e7e7e7', borderRadius: 10,
            overflow: 'hidden', textDecoration: 'none', color: 'inherit',
            display: 'flex', flexDirection: 'column',
            transition: 'border-color .18s,transform .18s,box-shadow .18s',
          }}>
            <div style={{ height: 125, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', fontWeight: 800, background: f.bg }}>
              {f.label}
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: GREEN_DARK, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: '#5f6763', fontSize: '0.92rem', lineHeight: 1.55, flex: 1, marginBottom: '1rem' }}>{f.desc}</p>
              <span style={{ color: GREEN, fontSize: '0.9rem', fontWeight: 800 }}>{f.link}</span>
            </div>
          </Link>
        ))}
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff', borderTop: '1px solid #e7e7e7' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '3.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.75rem', color: GREEN_DARK }}>Common Q&amp;A</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {FAQS.map((f, index) => {
              const isOpen = openFaq === index

              return (
                <div key={f.q} style={{
                  borderLeft: `2px solid ${GREEN_DARK}`,
                  background: '#f3f6f4',
                }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      padding: '1.1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: GREEN_DARK,
                      fontWeight: 800,
                      fontSize: '1rem',
                      textAlign: 'left',
                    }}
                  >
                    <span>{f.q}</span>
                    <span style={{ fontSize: '1.6rem', color: GREEN }}>
                      {isOpen ? '-' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 1.4rem 1.4rem',
                      color: '#5f6763',
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                    }}>
                      {f.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
      

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#909894', fontSize: '0.82rem', borderTop: '1px solid #e7e7e7', background: '#fff' }}>
        2026 Culinara — Cook, discuss, and discover.
      </footer>
    </div>
  )
}
