export default function Skeleton({ width = '100%', height = '20px', radius, style = {} }) {
  return <div className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
}
