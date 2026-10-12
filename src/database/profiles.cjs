module.exports = ({execute,transaction}) => {
  function text(value, limit, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid profile text');
    return value.trim();
  }
  return {
    async getProfile(userId) {
      const profile = (await execute('SELECT name,role,bio FROM profiles WHERE user_id=?', [userId]))[0];
      return profile ? { ...profile, links: await execute('SELECT name,url FROM links WHERE user_id=? ORDER BY position', [userId]) } : null;
    },
    async saveProfile(userId, input) {
      if (!input || !Array.isArray(input.links) || input.links.length > 30) throw new Error('Invalid profile');
      const name = text(input.name,80,true), role = text(input.role,100,true), bio = text(input.bio,500);
      const links = input.links.map(link => {
        const name = text(link?.name,80,true), url = new URL(text(link?.url,2048,true));
        if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid URL');
        return { name, url: url.href };
      });
      await transaction(async connection => {
        const [[user]] = await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [userId]);
        if (!user) throw new Error('Unknown user');
        await connection.execute('UPDATE profiles SET name=?,role=?,bio=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?', [name,role,bio,userId]);
        await connection.execute('DELETE FROM links WHERE user_id=?', [userId]);
        for (const [index,link] of links.entries()) await connection.execute('INSERT INTO links(user_id,position,name,url) VALUES(?,?,?,?)', [userId,index,link.name,link.url]);
      });
    },
  };
};
