import { memo } from 'react';
import { FiExternalLink, FiMapPin, FiNavigation } from 'react-icons/fi';

function LocationMessage({ message }) {
  const location = message.metadata?.location || {};
  const latitude = location.lat ?? location.latitude;
  const longitude = location.lng ?? location.longitude;
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const address = location.address || (message.content && !/\.(png|jpe?g|webp)$/i.test(message.content) ? message.content : '') || 'Shared location';
  const mapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${latitude},${longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return <div className="w-[min(320px,calc(100vw-32px))] max-w-full cursor-pointer overflow-hidden rounded-xl border border-border/[.55] bg-surface-elevated/[.94]">
    <div className="relative h-32 overflow-hidden bg-[linear-gradient(135deg,#d7e4d0,#b7d2df)]" aria-label="Map preview">
      <span className="absolute left-[-18%] top-[38%] block h-[7px] w-[150%] rotate-[-24deg] rounded-full bg-white/[.88]" /><span className="absolute left-[-22%] top-[67%] block h-[7px] w-[150%] rotate-[21deg] rounded-full bg-white/[.88]" /><span className="absolute left-[34%] top-[10%] block h-[7px] w-[150%] rotate-[72deg] rounded-full bg-white/[.88]" />
      <span className="absolute left-1/2 top-1/2 grid h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] place-items-center rounded-[999px_999px_999px_0] bg-danger text-white"><FiMapPin className="rotate-45" aria-hidden="true" /></span>
      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/[.6] px-2 py-1 text-[11px] font-bold text-white"><FiNavigation aria-hidden="true" />Shared location</span>
    </div>
    <div className="flex flex-col gap-[3px] p-[8px_12px] text-xs"><strong className="text-sm">{address}</strong>{hasCoordinates && <span>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>}<a className="inline-flex items-center gap-1 font-semibold text-primary" href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>Open in Google Maps <FiExternalLink aria-hidden="true" /></a></div>
  </div>;
}

export default memo(LocationMessage);
