import React from 'react';

const RecentArticles = ({ articles }) => {
  return (
    <div className="articles-container">
      <h2 className="articles-heading">Recent articles</h2>
      <div className="articles-list">
        {articles.map((article, index) => (
          <div key={index} className="article-card">
            <p>{article}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentArticles;