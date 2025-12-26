
import React from 'react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'notice': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'safety': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'event': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'marketplace': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'notice': return 'お知らせ';
      case 'safety': return '防犯・安全';
      case 'event': return 'イベント';
      case 'marketplace': return '商店街';
      default: return '全般';
    }
  };

  return (
    <article className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
             <img src={post.userAvatar} alt="Avatar" className="w-8 h-8 opacity-80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-sm">{post.userName}</h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">匿名ユーザー</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold">{new Date(post.createdAt).toLocaleDateString('ja-JP')} ・ {post.area}</p>
          </div>
          <div className="ml-auto">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${getCategoryStyles(post.category)}`}>
              {getCategoryLabel(post.category)}
            </span>
          </div>
        </div>

        <h4 className="text-lg font-black mb-2 text-slate-800 leading-tight">{post.title}</h4>
        <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap font-medium">{post.content}</p>

        {post.imageUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 border border-slate-100">
            <img src={post.imageUrl} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
          </div>
        )}

        <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
          <button 
            onClick={() => onLike(post.id)}
            className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-pink-50 transition-colors">
              <i className="far fa-heart"></i>
            </div>
            <span className="text-xs font-black">{post.likes}</span>
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
      </div>
    </article>
  );
};

export default PostCard;
