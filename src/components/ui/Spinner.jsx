export default function Spinner({ size = 24 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid #ece4dc`,
        borderTopColor: '#c9a99a',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('spinner-style')) {
  const s = document.createElement('style')
  s.id = 'spinner-style'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}
