"use strict";
import _ from "underscore";
import { arrayUnion, collection, collectionGroup, deleteField, doc, documentId, getDoc, getDocs, increment, query, runTransaction, setDoc, updateDoc, where, Timestamp } from "firebase/firestore";
import { getHex } from "pastel-color";
import useGlobalCache from "../hooks/useGlobalCache";

let $, db;

const max_query_in_size = 10;

const firestore = {
  set_$: function(_$) {
    $ = _$;
    db = $.db;
  },
  fetch_users: async function(ids, is_calling_from_fetch_posts) {
    if (_.size(ids) === 0) {
      return [];
    }
    const id_chunks = _.chunk(ids, max_query_in_size);
    const users = [];
    await Promise.all(id_chunks.map(async (id_chunk) => {
      const q_user = query(collection(db, "users"), where(documentId(), "in", id_chunk));
      const snap_users = await getDocs(q_user);
      if (_.size(snap_users.docs) === 0) {
        return [];
      }
      _.each(snap_users.docs, function(user_doc) {
        users.push(user_doc.data());
      });
      await firestore.fetch_user_dependencies(users, is_calling_from_fetch_posts);
    }));
    return users;
  },
  fetch_user_dependencies: async function(users, is_calling_from_fetch_posts) {
    if (_.size(users) === 0) {
      return;
    }
    
    const user_chunks = _.chunk(users, max_query_in_size);
    await Promise.all(user_chunks.map(async (user_chunk) => {
      const reaction_ids = [];
      const user_ids = [];
      const post_ids = [];
      _.each(user_chunk, function(user) {
        if (user.id !== $.session.uid) {
          user_ids.push(user.id); 
        }
        if (user.current_post_id) {
          reaction_ids.push("like-" + user.current_post_id);
          post_ids.push(user.current_post_id);
        }
      });

      const q_relationship = (_.size(user_ids) === 0) ? null : query(collection(db, "users/" + $.session.uid + "/relationships"), where(documentId(), "in", user_ids));
      let snap_relationships, posts;

      await Promise.all([
        snap_relationships = q_relationship ? await getDocs(q_relationship) : null,
        posts = (_.size(post_ids) === 0 || is_calling_from_fetch_posts) ? null : await firestore.fetch_posts(post_ids, true)
      ]);
      
      
      const relationship_by_uid = {};

      if (snap_relationships) {
        _.each(snap_relationships.docs, function(doc_relationship) {
          const relationship = doc_relationship.data();
          relationship_by_uid[relationship.uid] = relationship;
        });
      }

      const posts_by_id = {};
      _.each(posts, function(post) {
        posts_by_id[post.id] = post;
      });

      _.each(user_chunk, function(user) {
        if (user.id !== $.session.uid) {
          user.outgoing_status = relationship_by_uid[user.id] ? relationship_by_uid[user.id].status : "none"; 
        }
        user.current_post = posts_by_id[user.current_post_id];
      });

      return users;
    }));
  },
  fetch_posts: async function(post_ids, is_calling_from_fetch_users) {
    if (_.size(post_ids) === 0) {
      return;
    }
    const posts = [];
    const post_id_chunks = _.chunk(post_ids, max_query_in_size);
    await Promise.all(post_id_chunks.map(async (post_id_chunk) => {
      const q_posts = query(collectionGroup(db, "posts"), where("id", "in", post_id_chunk));
      const snap_posts =  await getDocs(q_posts);
      
      _.each(snap_posts.docs, function(post_doc) {
        if (post_doc.exists()) {
          posts.push(post_doc.data());
        }
      });
      
      if (_.size(posts) > 0) {
        await firestore.fetch_post_dependencies(posts, is_calling_from_fetch_users);
      }
    }));
    return posts;
  },
  fetch_post_dependencies: async function(posts, is_calling_from_fetch_users) {
    if (_.size(posts) === 0) {
      return;
    }

    const post_chunks = _.chunk(posts, max_query_in_size);
    await Promise.all(post_chunks.map(async (post_chunk) => {
      const user_ids = [], reaction_ids = [];
      _.each(post_chunk, function(post) {
        user_ids.push(post.uid);
        reaction_ids.push("like-" + post.id);
      });

      const q_reaction = _.size(reaction_ids) === 0 ? null : query(collection(db, "users/" + $.session.uid + "/reactions"), where(documentId(), "in", reaction_ids));
      let snap_reactions, users;

      await Promise.all([
        users = (_.size(user_ids) === 0 || is_calling_from_fetch_users) ? null : await firestore.fetch_users(user_ids, true),
        snap_reactions = q_reaction ? await getDocs(q_reaction) : null
      ]);
      
      const users_by_id = {};
      _.each(users, function(user) {
        users_by_id[user.id] = user;
      });
      
      const liked_by_post_id = {};
      if (snap_reactions) {
        _.each(snap_reactions.docs, function(reaction_doc) {
          if (reaction_doc.exists()) {
            const reaction = reaction_doc.data();
            if (reaction.is_liked) {
              liked_by_post_id[reaction.parent_id] = true;
            }
          }
        });        
      }

      _.each(post_chunk, function(post) {
        post.is_liked = liked_by_post_id[post.id] || false;
        post.user = users_by_id[post.uid];
      });

    }));
  },
  create_post: async function(params) {
    const current_user = $.get_current_user();
    if (!current_user) {
      return;
    }

    const url = params.image.secure_url;
    const now = Timestamp.now();
    const new_id = doc(collection(db, "users/" + current_user.id + "/posts")).id;
    const new_post = {
      id: new_id,
      kind: "post",
      uid: $.session.uid,
      is_account_public: current_user.is_account_public,
      created_at: now,
      updated_at: now,
      emoji_char: params.emoji_char,
      emoji_group: params.emoji_group,
      image_url: url,
      is_current: true,
      rev: 0
    };
    
    if (params.caption) {
      new_post.caption = params.caption;
    }
    
    if (params.location) {
      new_post.location = params.location;
      new_post.location_id = new_post.location.id;
    }

    const current_user_ref = doc(db, "users", current_user.id);
    
    await runTransaction(db, async (transaction) => {
      const current_user_doc = await transaction.get(current_user_ref);
      const current_user = current_user_doc.data();
      if (current_user.current_post_id) {
        const prev_post_ref = doc(db, "users/" + current_user.id + "/posts", current_user.current_post_id);
        await transaction.update(prev_post_ref, {is_current: false, rev: increment(1), updated_at: now});
      }
      
      const new_post_ref = doc(db, "users/" + current_user.id + "/posts", new_post.id);
      await transaction.set(new_post_ref, new_post);
      
      const user_updates = {
        post_count: increment(1),
        current_post_id: new_post.id,
        current_post_emoji_char: new_post.emoji_char,
        current_post_emoji_group: new_post.emoji_group,
        current_post_created_at: new_post.created_at,
        rev: increment(1),
        updated_at: now
      };
      
      user_updates["emoji_counts." + new_post.emoji_char] = increment(1);
      await transaction.update(current_user_ref, user_updates);
    });

    return new_post;
  },
  delete_post: async function(id) {
    const current_user_ref = doc(db, "users", $.session.uid);
    const post_ref = doc(db, "users/" + $.session.uid + "/posts", id);
    
    await runTransaction(db, async (transaction) => {
      const current_user_doc = await transaction.get(current_user_ref);
      if (!current_user_doc.exists()) {
        return;
      }
      const current_user = current_user_doc.data();
      const post_doc = await transaction.get(post_ref);
      if (!post_doc.exists()) {
        return;
      }
      
      const post = post_doc.data();
      const now = Timestamp.now();
      const user_updates = {
        post_count:  increment(-1),
        rev: increment(1),
        updated_at: now
      };
      
      user_updates["emoji_counts." + post.emoji_char] = increment(-1);

      if (current_user.current_post_id && current_user.current_post_id === id) {
        user_updates.current_post_id = deleteField();
        user_updates.current_post_emoji_char = deleteField();
      }

      await transaction.update(current_user_ref, user_updates);
      await transaction.delete(post_ref);
    });

    return;
  },
  create_like: async function(parent_user_id, parent_id, parent_kind) {
    const reaction_ref = doc(db, "users/" + $.session.uid + "/reactions", "like-" + parent_id);
    await runTransaction(db, async (transaction) => {
      const reaction_doc_snap = await transaction.get(reaction_ref);
      if (reaction_doc_snap.exists()) {
        const reaction = reaction_doc_snap.data();
        if (reaction.is_liked) {
          return;
        }
      }
       
      const now = Timestamp.now();
      
      const updates = {
        like_count: increment(1),
        updated_at: now,
        rev: increment(1)
      };
      
      if (parent_kind === "post") {
        const post_ref = doc(db, "users/" + parent_user_id+ "/posts", parent_id);
        await transaction.update(post_ref, updates);
      } else {
        const comment_ref = doc(db, "users/" + parent_user_id+ "/reactions", parent_id);
        await transaction.update(comment_ref, updates);
      }
      
      const like = {
        uid: $.session.uid,
        updated_at: now, 
        is_liked: true, 
        internal_like_count: increment(1), 
        rev: increment(1), 
        parent_id: parent_id, 
        parent_kind: parent_kind, 
        parent_user_id: parent_user_id,
        kind: "like"
      };

      await transaction.set(reaction_ref, like);
      
      // alerts are best effort, will probably movo to a trigger
      const activity = {
        id: $.session.uid + "_" + parent_id,
        created_at: now,
        group: "like_" + like.parent_id + "_" + like.updated_at.toDate().toISOString().split("T")[0],
        verb: "like",
        target: parent_id,
        actor: like.uid
      };
      const like_alert_ref = doc(db, "users/" + parent_user_id + "/alerts", activity.group);
      const alerts_updates = { updated_at: now };
      alerts_updates["activities." + activity.id] = activity;
      await setDoc(like_alert_ref, alerts_updates, {merge: true});
    });
  },
  delete_like: async function(parent_id) {
    const reaction_ref = doc(db, "users/" + $.session.uid + "/reactions", "like-" + parent_id);
    await runTransaction(db, async (transaction) => {
      const reaction_doc_snap = await transaction.get(reaction_ref);
      if (reaction_doc_snap.exists()) {
        const reaction = reaction_doc_snap.data();
        if (reaction.is_liked) {
          const updates = {
            like_count: increment(-1),
            updated_at: Timestamp.now(),
            rev: increment(1)
          };

          if (reaction.parent_kind === "post") {
            const post_ref = doc(db, "users/" + reaction.parent_user_id + "/posts", parent_id);
            await transaction.update(post_ref, updates);
          } else {
            const comment_ref = doc(db, "users/" + reaction.parent_user_id + "/reactions", parent_id);
            await transaction.update(comment_ref, updates);
          }
          await transaction.update(reaction_ref, { updated_at: Timestamp.now(), is_liked: deleteField(), rev: increment(1) });
          
          const like_alert_ref = doc(db, "users/" + reaction.parent_user_id + "/alerts", "like_" + reaction.parent_id + "_" + reaction.updated_at.toDate().toISOString().split("T")[0]);
          const alerts_updates = {};
          alerts_updates["activities." + reaction.id] = deleteField();
          await setDoc(like_alert_ref, alerts_updates, {merge: true});
        }
      }
    });
  },
  create_comment: async function(parent_user_id, parent_id, parent_kind, text) {
    const now = Timestamp.now();
    const new_id = doc(collection(db, "users/" + $.session.uid + "/reactions")).id;
    const new_reaction = {
      id: new_id,
      parent_user_id: parent_user_id,
      parent_id: parent_id,
      parent_kind: parent_kind,
      uid: $.session.uid,
      created_at: now,
      updated_at: now,
      kind: "comment",
      text: text,
      depth: 0,
      rev: 0
    };
    
    const parent_updates = {
      comment_count: increment(1),
      updated_at: now,
      rev: increment(1)
    };
    
    await runTransaction(db, async (transaction) => {
      if (parent_kind === "post") {
          const post_ref = doc(db, "users/" + parent_user_id+ "/posts", parent_id);
          await transaction.update(post_ref, parent_updates);
      } else {
        const parent_comment_ref = doc(db, "users/" + parent_user_id+ "/reactions", parent_id);
        const parent_comment_doc = await transaction.get(parent_comment_ref);
        if (!parent_comment_doc.exists()) {
          return;
        }
        const parent_comment = parent_comment_doc.data();
        new_reaction.depth = parent_comment.depth + 1;
        await transaction.update(parent_comment_ref, parent_updates);
      }
      const new_reaction_ref = doc(db, "users/" + $.session.uid + "/reactions", new_reaction.id);
      await transaction.set(new_reaction_ref, new_reaction);
      
      
      // alerts are best effort, will probably movo to a trigger
      const activity = {
        id: new_reaction.id,
        created_at: now,
        group: "comment_" + new_reaction.parent_id + "_" + new_reaction.created_at.toDate().toISOString().split("T")[0],
        verb: "comment",
        target: parent_id,
        actor: new_reaction.uid
      };
      const comment_alert_ref = doc(db, "users/" + parent_user_id + "/alerts", activity.group);
      const alerts_updates = { updated_at: now };
      alerts_updates["activities." + activity.id] = activity;
      await setDoc(comment_alert_ref, alerts_updates, {merge: true});
    });

    return new_reaction;
  },
  delete_comment: async function(id) {
    const reaction_ref = doc(db, "users/" + $.session.uid+ "/reactions", id);
    await runTransaction(db, async (transaction) => {
      const reaction_doc_snap = await transaction.get(reaction_ref);
      if (reaction_doc_snap.exists()) {
        const reaction = reaction_doc_snap.data();
        if (reaction.kind === "comment") {
          const updates = {
            comment_count: increment(-1),
            updated_at: Timestamp.now(),
            rev: increment(1)
          };
          
          if (reaction.parent_kind === "post") {
            const post_ref = doc(db, "users/" + reaction.parent_user_id + "/posts", reaction.parent_id);
            await transaction.update(post_ref, updates);
          } else {
            const comment_ref = doc(db, "users/" + reaction.parent_user_id+ "/reactions", id);
            await transaction.update(comment_ref, updates);
          }

          await transaction.delete(reaction_ref);
          
          const comment_alert_ref = doc(db, "users/" + reaction.parent_user_id + "/alerts", reaction.activity.group);
          const alerts_updates = {};
          alerts_updates["activities." + reaction.id] = deleteField();
          await setDoc(comment_alert_ref, alerts_updates, {merge: true});
        }
      }
    });
  },
  fetch_comment_dependencies: async function(comments, options) {
    if (_.size(comments) === 0) {
      return;
    }
    
    options = options || {};
    const comment_chunks = _.chunk(comments, max_query_in_size);
    await Promise.all(comment_chunks.map(async (comment_chunk) => {
      const reaction_ids = [];
      const user_ids = {};
      _.each(comment_chunk, function(comment) {
        user_ids[comment.uid] = true; 
        reaction_ids.push("like-" + comment.id);
      });
      
      const q_reaction = _.size(reaction_ids) === 0 ? null : query(collection(db, "users/" + $.session.uid + "/reactions"), where(documentId(), "in", reaction_ids));
      let snap_reactions;

      await Promise.all([
        await firestore.fetch_users(_.keys(user_ids)),
        snap_reactions = q_reaction ? await getDocs(q_reaction) : null
      ]);
      
      const liked_by_comment_id = {};
      _.each(snap_reactions.docs, function(reaction_doc) {
        if (reaction_doc.exists()) {
          const reaction = reaction_doc.data();
          if (reaction.is_liked) {
            liked_by_comment_id[reaction.parent_id] = true;
          }
        }
      });

      _.each(comment_chunk, function(comment) {
        comment.is_liked = liked_by_comment_id[comment.id] || false;
      });

    }));
  },
  invite_contact: async function(params) {
    const invited_doc_ref = doc(db, "users/" + $.session.uid + "/invites/contacts");
    const invited = {};
    _.each(params.phones, function(phone) {
      invited[phone] = Timestamp.now();
    });
    await setDoc(invited_doc_ref, invited, { merge: true });
  },
  create_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "users/" + $.session.uid + "/messaging_configs", params.token);
    const update = { uid: $.session.uid, token: params.token, created_at: Timestamp.now(), rev: 0 };
    await setDoc(messaging_config_doc_ref, update);
    $.session.messaging_config = update;
  },
  update_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "users/" + $.session.uid + "/messaging_configs", params.token);
    const update = params.settings;
    update.updated_at = Timestamp.now();
    update.uid = $.session.uid;
    await updateDoc(messaging_config_doc_ref, _.extend({ rev: increment(1) }, update));
    _.extend($.session.messaging_config, update);
  },
  is_username_available: async function(params) {
    const username_ref = doc(db, "usernames", params.username);
    const username_doc_snap = await getDoc(username_ref);
    return !username_doc_snap.exists();
  },
  clear_unread_request_by_count: async function() {
    const user_doc_ref = doc(db, "users", $.session.uid);
    const update = { unread_request_by_count: 0 };
    await updateDoc(user_doc_ref, _.extend({ rev: increment(1) }, update));
  },
  update_current_user_account_privacy: async function(params) {
    const user_doc_ref = doc(db, "users", $.session.uid);
    const now = Timestamp.now();
    await runTransaction(db, async (transaction) => {
      const user_snap = await transaction.get(user_doc_ref);
      if (user_snap.exists()) {
        const user = user_snap.data();
        if (user.is_account_public === params.is_account_public) {
          return;
        }
        if (user.current_post_id) {
          const current_post_ref = doc(db, "users/" + $.session.uid + "/posts", user.current_post_id);
          await transaction.update(current_post_ref, {is_account_public: params.is_account_public, updated_at: now, rev: increment(1)});
        }
        await transaction.update(user_doc_ref, {is_account_public: params.is_account_public, updated_at: now, rev: increment(1)});
      }
    });
  },
  update_current_user: async function(params) {
    const user_doc_ref = doc(db, "users", $.session.uid);
    const user_doc_snap = await getDoc(user_doc_ref);
    if (!user_doc_snap.exists()) {
      throw new Error("users not found.");
    }
    const user = user_doc_snap.data();
    const user_updates = {};
    let username,
      username_doc_ref;
    const now = Timestamp.now();
    await runTransaction(db, async (transaction) => {
      if (params.username) {
        username_doc_ref = doc(db, "usernames", params.username.toLowerCase());
        const username_doc_snap = await transaction.get(username_doc_ref);
        if (username_doc_snap.exists()) {
          throw new Error("usersname taken.");
        }
        username = {
          id: params.username.toLowerCase(),
          created_at: Timestamp.now(),
          uid: $.session.uid,
          rev: 0
        };
        user_updates.username = params.username;
        user_updates.change_username_at = Timestamp.now();
        if (!user.profile_image_url || user.profile_image_url.indexOf("ui-avatars.com") !== -1) {
          user_updates.profile_image_url = "https://ui-avatars.com/api/?name=" + params.username + "&size=110&length=2&rounded=true&color=ffffff&background=" + getHex(params.username).replace("#", "");
        }
      }

      if (params.profile_image_url) {
        user_updates.profile_image_url = params.profile_image_url;
      }

      if (_.isString(params.name)) {
        user_updates.name = params.name;
      }
      if (_.isString(params.bio)) {
        user_updates.bio = params.bio;
      }

      if (_.size(username)) {
        transaction.set(username_doc_ref, _.extend({ rev: increment(1), updated_at: now }, username));
      }

      if (_.size(user_updates)) {
        transaction.update(user_doc_ref, _.extend({ rev: increment(1), updated_at: now }, user_updates));
      }
    });
  },
  update_relationship: async function(params) {
    const current_user_ref = doc(db, "users", $.session.uid);
    const user_ref = doc(db, "users", params.id);
    const relationship_doc_ref = doc(db, "users/" + $.session.uid + "/relationships", params.id);
    const other_relationship_ref = doc(db, "users/" + params.id + "/relationships", $.session.uid);

    const current_user = $.get_current_user();
    const user = useGlobalCache.cache_get(params.id);

    if (!current_user || !user) {
      return;
    }

    const result = { outgoing_status: "none" };

    await runTransaction(db, async (transaction) => {
      if (params.action === "approve" || params.action === "deny") {
        const other_relationship_doc_snap = await transaction.get(other_relationship_ref);
        if (other_relationship_doc_snap.exists()) {
          const other_relationship = other_relationship_doc_snap.data();
          if (other_relationship.status === "request") {
            await transaction.update(other_relationship_ref, {
              updated_at: Timestamp.now(),
              status: params.action === "approve" ? "follow" : "none",
              rev: increment(1)
            });
            const current_user_update = { updated_at: Timestamp.now(), rev: increment(1) };
            current_user_update.request_by_count = increment(-1);
            
            const user_update = { updated_at: Timestamp.now(), rev: increment(1) };
            user_update.request_count = increment(-1);
            if (params.action === "approve") {
              current_user_update.follow_by_count = increment(1);
              user_update.follow_count = increment(1);
            }
            await transaction.update(current_user_ref, _.extend({rev: increment(1)}, current_user_update));
            await transaction.update(user_ref, _.extend({rev: increment(1)}, user_update));
          }
        }
        const relationship_doc_snap = await getDoc(relationship_doc_ref);
        user.outgoing_status = relationship_doc_snap.exists() ? relationship_doc_snap.data().status : "none";
        return { outgoing_status: user.outgoing_status };
      }

      const relationship_doc_snap = await transaction.get(relationship_doc_ref);
      let relationship;
      if (relationship_doc_snap.exists()) {
        relationship = relationship_doc_snap.data();
        result.outgoing_status = relationship.status;
      }

      if (relationship && relationship.status === "block" && params.action !== "unblock") {
        _.extend(user, result);
        return result;
      }

      if (params.action === "follow") {
        if (!relationship || relationship.status === "none") {
          result.outgoing_status = user.is_account_public ? "follow" : "request";
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });
          }
          else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });
          }
          const current_user_updates = { rev: increment(1), updated_at: Timestamp.now() };
          if (user.is_account_public) {
            current_user_updates.follow_count = increment(1);
          }
          else {
            current_user_updates.request_count = increment(1);
          }

          await transaction.update(current_user_ref, _.extend(current_user_updates));
          
          
          const user_updates = { rev: increment(1), updated_at: Timestamp.now() };
          if (user.is_account_public) {
            user_updates.follow_by_count = increment(1);
            if (user.current_post_id) {
              const timeline_ref = doc(db, "users/" + $.session.uid + "/timeline", user.current_post_id);
              await transaction.set(timeline_ref, {uid: params.id, post_id: user.current_post_id, created_at: user.current_post_created_at, emoji_char: user.current_post_emoji_char, emoji_group: user.current_post_emoji_group}); 
            }
          }
          else {
            user_updates.request_by_count = increment(1);
            user_updates.unread_request_by_count = increment(1);
          }
          await transaction.update(user_ref, _.extend(user_updates));
        }
      }
      else if (params.action === "unfollow") {
        if (relationship && (relationship.status === "follow" || relationship.status === "request" || relationship.status === "ignore")) {
          result.outgoing_status = "none";
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });
          }
          else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });
          }
          
          const current_user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          const user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          if (relationship.status === "follow") {
            current_user_update.follow_count = increment(-1);
            user_update.follow_by_count = increment(-1);
            const timeline_ref = doc(db, "users/" + $.session.uid + "/timeline", user.current_post_id);
            await transaction.delete(timeline_ref);
          }
          else if (relationship.status === "request") {
            current_user_update.request_count = increment(-1);
            user_update.request_by_count = increment(-1);
          }
          else if (relationship.status === "ignore") {
            current_user_update.ignore_by_count = increment(-1);
            user_update.ignore_count = increment(-1);
          }
          await transaction.update(current_user_ref, _.extend(current_user_update));
          await transaction.update(user_ref, _.extend(user_update));
        }
      }
      else if (params.action === "block") {
        if (!relationship || (relationship.status !== "block")) {
          result.outgoing_status = "block";
          const other_relationship_doc_snap = await transaction.get(other_relationship_ref);
          
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });   
          } else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });    
          }
          
          if (other_relationship_doc_snap.exists()) {
            await transaction.update(other_relationship_ref, {
              updated_at: Timestamp.now(),
              status: "none",
              is_blocked: true,
              rev: increment(1)
            });
          } else {
            await transaction.set(other_relationship_ref, {
              id: user.id,
              uid: current_user.id,
              updated_at: Timestamp.now(),
              status: "none",
              is_blocked: true,
              rev: 0
            });
          }
        
          const current_user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          current_user_update.block_count = increment(1);
          if (relationship) {
            if (relationship.status === "follow") {
              current_user_update.follow_count = increment(-1);
            }
            else if (relationship.status === "request") {
              current_user_update.request_count = increment(-1);
            }
          }
          await transaction.update(current_user_ref, _.extend(current_user_update));
          const user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          if (relationship) {
            if (relationship.status === "follow") {
              user_update.follow_by_count = increment(-1);
            }
            else if (relationship.status === "request") {
              user_update.request_by_count = increment(-1);
            }
          }
          user_update.block_by_count = increment(1);
          await transaction.update(user_ref,  _.extend(user_update));
        }
      }
      else if (params.action === "unblock") {
        if (relationship && (relationship.status === "block")) {
          const other_relationship_ref = doc(db, "relationships", params.id + $.session.uid);
          result.outgoing_status = "none";
          await transaction.update(relationship_doc_ref, {
            updated_at: Timestamp.now(),
            status: result.outgoing_status,
            rev: increment(1)
          });
          await transaction.updater(other_relationship_ref, {
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: false,
            rev: increment(1)
          });
          const current_user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          current_user_update.block_count = increment(-1);
          await transaction.update(current_user_ref,  _.extend(current_user_update));
          const user_update = { updated_at: Timestamp.now(), rev: increment(1) };
          user_update.block_by_count = increment(-1);
          await transaction.update(user_ref,  _.extend(user_update));
        }
      }
    });
    _.extend(useGlobalCache.cache_get(params.id), result);
    return result;
  }
};

export default firestore;
