
import { Avatar } from '../../simulation/types';

interface AvatarRendererProps {
  avatars: Avatar[];
}

export function AvatarRenderer({ avatars }: AvatarRendererProps) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      {avatars.map(avatar => (
        <img
          key={avatar.id}
          src={avatar.asset}
          alt={avatar.role}
          style={{
            position: 'absolute',
            top: avatar.position.y,
            left: avatar.position.x,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid white',
          }}
        />
      ))}
    </div>
  );
}
