import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'FaucetDrops - The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/jpeg'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020817',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {/* Glowing Orb Background Effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(2, 8, 23, 0) 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Main Brand Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 90,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            zIndex: 10,
          }}
        >
          <span style={{ marginRight: 20 }}>💧</span>
          FaucetDrops
        </div>

        {/* Subtitle / Tagline */}
        <div
          style={{
            marginTop: 20,
            fontSize: 34,
            fontWeight: 500,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '80%',
            zIndex: 10,
          }}
        >
          The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution
        </div>

        {/* URL Pill */}
        <div
          style={{
            marginTop: 40,
            padding: '12px 32px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '50px',
            fontSize: 22,
            color: '#38bdf8',
            zIndex: 10,
          }}
        >
          faucetdrops.io
        </div>
      </div>
    ),
    { ...size }
  )
}