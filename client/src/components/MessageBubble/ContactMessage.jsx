import { memo } from 'react';
import { FiPhone, FiUser, FiUserPlus } from 'react-icons/fi';

function ContactMessage({ message }) {
  const contact = message.metadata?.contact || {};
  const name = contact.name || 'Unknown contact';
  const phone = contact.phone || '';
  return <div className="flex flex-col items-stretch gap-2 overflow-hidden rounded-xl bg-black/[.1] p-2">
    <div className="flex items-center gap-[9px]">
      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-primary/[.15]">{contact.avatar ? <img className="h-full w-full object-cover" src={contact.avatar} alt="" loading="lazy" /> : <FiUser aria-hidden="true" />}</span>
      <span className="flex flex-col"><strong>{name}</strong>{phone && <small className="opacity-70">{phone}</small>}</span>
    </div>
    <div className="flex gap-1.5">
      {phone && <a className="flex-1 rounded-lg bg-text-primary/[.07] px-2 py-1.5 text-[11px]" href={`tel:${phone}`} onClick={(event) => event.stopPropagation()}><FiPhone aria-hidden="true" />Call</a>}
      <button className="flex-1 rounded-lg bg-text-primary/[.07] px-2 py-1.5 text-[11px]" type="button" onClick={(event) => event.stopPropagation()}><FiUserPlus aria-hidden="true" />Save contact</button>
    </div>
  </div>;
}

export default memo(ContactMessage);
