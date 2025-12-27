
import React from 'react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  const [isLikeAnimating, setIsLikeAnimating] = React.useState(false);

  // ... (keep helpers)

  const handleLike = () => {
    setIsLikeAnimating(true);
    onLike(post.id);
    setTimeout(() => setIsLikeAnimating(false), 300);
  };

  // ... (inside JSX)
  <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
    <button
      onClick={handleLike}
      className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors group"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-pink-50 transition-colors ${isLikeAnimating ? 'animate-ping' : ''}`}>
        <i className={`far fa-heart ${isLikeAnimating ? 'text-pink-500 font-bold' : ''}`}></i>
      </div>
      <span className={`text-xs font-black transition-transform ${isLikeAnimating ? 'scale-125 text-pink-500' : ''}`}>{post.likes}</span>
    </button>
    <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <i className="far fa-comment"></i>
      </div>
      <span className="text-xs font-black">{post.comments.length}</span>
    </button>
    <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 ml-auto transition-colors group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
        <i className="far fa-share-square"></i>
      </div>
    </button>
  </div>
      </div >
    </article >
  );
};

export default PostCard;
