import React from 'react';

export const SpotifyPlayer: React.FC = () => {
    return (
        <div className="spotify-player-container">
            <iframe 
                style={{ borderRadius: '12px' }} 
                src="https://open.spotify.com/embed/playlist/1LvN1RFjsyLqrJIxZar6Yl?utm_source=generator&theme=0" 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allowFullScreen={false} 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
            ></iframe>
        </div>
    );
};
