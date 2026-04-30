import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { ThemeToggleButton, useAuth } from '../context/AppProviders'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatDate(value) {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString()
}

const messageBorderPalette = ['#38bdf8', '#f97316', '#22c55e', '#eab308', '#a78bfa', '#fb7185', '#14b8a6', '#f43f5e']

function pickMessageBorderColor(message) {
  const seed = String(message?.senderId ?? message?.userId ?? message?.senderName ?? 'chat-user')

  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return messageBorderPalette[hash % messageBorderPalette.length]
}

async function apiFetch(path, options = {}, token) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, token, signOut, isReady } = useAuth()
  const [posts, setPosts] = useState([])
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postForm, setPostForm] = useState({ title: '', content: '' })
  const [postError, setPostError] = useState('')
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [chatMode, setChatMode] = useState('global')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState('')
  const [postChatMessages, setPostChatMessages] = useState([])
  const [postChatInput, setPostChatInput] = useState('')
  const [postChatError, setPostChatError] = useState('')
  const socketRef = useRef(null)
  const chatListRef = useRef(null)
  const postChatListRef = useRef(null)
  const joinedPostIdRef = useRef(null)
  const selectedPostIdRef = useRef(null)

  useEffect(() => {
    selectedPostIdRef.current = selectedPostId
  }, [selectedPostId])

  const selectedPostIsOwner = useMemo(() => {
    if (!selectedPost || !user) return false
    return String(selectedPost.userId) === String(user.id)
  }, [selectedPost, user])

  // Load posts
  useEffect(() => {
    let alive = true

    async function loadPosts() {
      setLoadingPosts(true)
      try {
        const data = await apiFetch('/api/posts')
        if (!alive) return
        setPosts(data.posts || [])
      } catch (error) {
        if (!alive) return
        setPostError(error.message)
      } finally {
        if (alive) setLoadingPosts(false)
      }
    }

    loadPosts()
    return () => {
      alive = false
    }
  }, [])

  // Load selected post
  useEffect(() => {
    let alive = true

    async function loadSelectedPost() {
      if (!selectedPostId) {
        setSelectedPost(null)
        setPostForm({ title: '', content: '' })
        return
      }

      try {
        const data = await apiFetch(`/api/posts/${selectedPostId}`)
        if (!alive) return
        setSelectedPost(data.post)
        setPostForm({ title: data.post.title, content: data.post.content })
      } catch (error) {
        if (!alive) return
        setPostError(error.message)
      }
    }

    loadSelectedPost()
    return () => {
      alive = false
    }
  }, [selectedPostId])

  // Socket.IO connection
  useEffect(() => {
    if (!token || !user) return undefined

    const socket = io(apiBase, {
      auth: { token },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('global:join')
      socket.emit('posts:join')
    })

    // Posts events
    socket.on('posts:history', (posts) => {
      setPosts(posts || [])
    })

    socket.on('post:created', (newPost) => {
      setPosts((current) => {
        if (current.some((post) => post.id === newPost.id)) {
          return current
        }
        return [newPost, ...current]
      })
    })

    socket.on('post:updated', (updatedPost) => {
      setPosts((current) =>
        current.map((post) =>
          String(post.id) === String(updatedPost.id) ? { ...post, ...updatedPost } : post
        )
      )
      // Update selected post if it's the one being updated
      if (selectedPostId && String(selectedPostId) === String(updatedPost.id)) {
        setSelectedPost(updatedPost)
        setPostForm({ title: updatedPost.title, content: updatedPost.content })
      }
    })

    socket.on('post:deleted', (payload) => {
      setPosts((current) => current.filter((post) => String(post.id) !== String(payload.postId)))
      // Deselect if the deleted post was selected
      if (selectedPostId && String(selectedPostId) === String(payload.postId)) {
        setSelectedPostId(null)
        setSelectedPost(null)
        setPostForm({ title: '', content: '' })
      }
    })

    // Global chat events
    socket.on('global:history', (messages) => {
      setChatMessages(messages || [])
    })

    socket.on('global:message', (message) => {
      setChatMessages((current) => {
        if (current.some((entry) => entry.id === message.id)) {
          return current
        }
        return [...current, message]
      })
    })

    socket.on('post:history', (payload) => {
      const postId = payload && payload.postId ? String(payload.postId) : ''
      if (!postId || String(postId) !== String(selectedPostIdRef.current)) return
      setPostChatMessages((payload && payload.messages) || [])
    })

    socket.on('post:message', (message) => {
      if (!message || String(message.postId) !== String(selectedPostIdRef.current)) return
      setPostChatMessages((current) => {
        if (current.some((entry) => entry.id === message.id)) {
          return current
        }
        return [...current, message]
      })
    })

    socket.on('post:error', (payload) => {
      const postId = payload && payload.postId ? String(payload.postId) : ''
      if (!postId || String(postId) !== String(selectedPostIdRef.current)) return
      setPostChatError(payload && payload.message ? String(payload.message) : 'Post chat error')
    })

    socket.on('connect_error', (error) => {
      setChatError(error.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, user])

  // Join/leave post chat when selected post changes
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const previousPostId = joinedPostIdRef.current
    if (previousPostId && String(previousPostId) !== String(selectedPostId)) {
      socket.emit('post:leave', { postId: previousPostId })
      joinedPostIdRef.current = null
      setPostChatMessages([])
      setPostChatInput('')
      setPostChatError('')
    }

    if (selectedPostId) {
      socket.emit('post:join', { postId: selectedPostId })
      joinedPostIdRef.current = selectedPostId
      setChatMode('post')
    } else if (chatMode === 'post') {
      setChatMode('global')
    }
  }, [selectedPostId, chatMode])

  // Auto-scroll chat
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight
    }
  }, [chatMessages])

  // Auto-scroll post chat
  useEffect(() => {
    if (postChatListRef.current) {
      postChatListRef.current.scrollTop = postChatListRef.current.scrollHeight
    }
  }, [postChatMessages])

  async function handleCreateOrUpdatePost(event) {
    event.preventDefault()
    if (!token) {
      setPostError('Please log in first.')
      return
    }

    try {
      const isEditing = Boolean(selectedPostId)
      const data = await apiFetch(
        isEditing ? `/api/posts/${selectedPostId}` : '/api/posts',
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify(postForm),
        },
        token
      )

      const savedPost = data.post
      const nextPosts = isEditing
        ? posts.map((post) => (String(post.id) === String(savedPost.id) ? { ...post, ...savedPost } : post))
        : [savedPost, ...posts]

      setPosts(nextPosts)
      setSelectedPost(savedPost)
      setSelectedPostId(savedPost.id)
      setPostError('')
    } catch (error) {
      setPostError(error.message)
    }
  }

  async function handleDeletePost() {
    if (!token || !selectedPostId) return

    try {
      await apiFetch(`/api/posts/${selectedPostId}`, { method: 'DELETE' }, token)
      setPosts((current) => current.filter((post) => String(post.id) !== String(selectedPostId)))
      setSelectedPostId(null)
      setSelectedPost(null)
      setPostForm({ title: '', content: '' })
    } catch (error) {
      setPostError(error.message)
    }
  }

  function handleSendChatMessage(event) {
    event.preventDefault()

    const content = chatInput.trim()
    if (!content || !socketRef.current) return

    socketRef.current.emit('global:message', { content })
    setChatInput('')
  }

  function handleSendPostChatMessage(event) {
    event.preventDefault()

    const content = postChatInput.trim()
    if (!content || !socketRef.current || !selectedPostId) return

    socketRef.current.emit('post:message', { postId: selectedPostId, content })
    setPostChatInput('')
  }

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  if (!isReady || !user || !token) {
    return <div className="app-shell flex items-center justify-center min-h-screen text-sm text-[var(--app-text-muted)]">Loading...</div>
  }

  return (
    <div className="app-shell flex flex-col min-h-screen">
      <header className="app-panel-solid border-b border-[var(--app-border)] p-5 md:p-6 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <p className="app-muted text-xs font-semibold uppercase tracking-[0.32em] mb-2">ChatRoom</p>
            <h1 className="text-2xl font-bold app-heading">Blog Platform</h1>
            <p className="app-muted text-sm mt-1">Write, share, and connect in real time</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm app-muted hidden sm:block">
              Logged in as <span className="font-semibold app-heading">{user.name}</span>
            </span>
            <ThemeToggleButton />
            <button onClick={handleLogout} className="app-button-danger px-4 py-2 rounded-xl font-semibold transition">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex gap-0 w-full overflow-hidden flex-col lg:flex-row">
        <section className="w-full lg:w-[70%] flex flex-col gap-6 overflow-y-auto p-4 md:p-6 border-r border-[var(--app-border)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold app-heading">{selectedPost ? 'View & Edit Post' : 'Blog Posts'}</h2>
            {selectedPost && (
              <button onClick={() => setSelectedPostId(null)} className="app-button-secondary px-3 py-2 rounded-xl transition text-sm">
                ← Back to posts
              </button>
            )}
          </div>

          {loadingPosts ? (
            <p className="app-muted">Loading posts...</p>
          ) : !selectedPost ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className="app-panel rounded-2xl p-4 cursor-pointer hover:-translate-y-1 transition transform"
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="font-semibold app-heading">{post.title}</h3>
                      <small className="app-muted whitespace-nowrap text-xs">{formatDate(post.createdAt)}</small>
                    </div>
                    <p className="app-muted text-sm line-clamp-2 mb-2">{post.content.substring(0, 100)}...</p>
                    <p className="app-muted text-xs">by {post.authorName}</p>
                  </div>
                ))
              ) : (
                <p className="app-muted col-span-full text-center py-8">No posts yet. Create one!</p>
              )}
            </div>
          ) : (
            <div className="app-panel rounded-3xl p-6">
              <div className="flex justify-between items-start gap-4 mb-6 pb-6 border-b border-[var(--app-border)]">
                <div>
                  <p className="app-muted text-xs font-semibold uppercase tracking-wider mb-1">By {selectedPost.authorName}</p>
                  <h3 className="text-2xl font-bold app-heading">{selectedPost.title}</h3>
                </div>
                <span className="app-muted text-xs whitespace-nowrap">{formatDate(selectedPost.createdAt)}</span>
              </div>
              <div className="app-heading text-sm leading-relaxed whitespace-pre-wrap mb-6">{selectedPost.content}</div>
              {selectedPostIsOwner && (
                <div className="flex gap-2">
                  <button onClick={handleDeletePost} className="app-button-danger px-4 py-2 rounded-xl transition font-semibold">
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="app-panel rounded-3xl p-6">
            <h3 className="text-lg font-bold app-heading mb-4">{selectedPost ? 'Edit Post' : 'Create New Post'}</h3>
            <form onSubmit={handleCreateOrUpdatePost} className="space-y-4">
              <input
                type="text"
                placeholder="Post title"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                className="app-input"
              />
              <textarea
                rows="6"
                placeholder="Post content"
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                className="app-input resize-none"
              />
              <button type="submit" className="app-button-primary w-full py-3 rounded-xl font-semibold transition">
                {selectedPost ? 'Update Post' : 'Publish Post'}
              </button>
            </form>
            {postError && <p className="app-error text-sm mt-4 p-3 rounded-xl">{postError}</p>}
          </div>
        </section>

        <aside className="w-full lg:w-[30%] flex flex-col app-panel-solid border-l border-[var(--app-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--app-border)]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold app-heading">{chatMode === 'post' ? 'Post Chat' : 'Global Chat'}</h2>
              <span className="app-chip px-2 py-1 rounded-full">Live</span>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setChatMode('global')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                  chatMode === 'global' ? 'app-button-primary border-transparent' : 'app-button-secondary border-[var(--app-border)]'
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedPostId) return
                  setChatMode('post')
                }}
                disabled={!selectedPostId}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                  !selectedPostId
                    ? 'bg-[color:color-mix(in_srgb,var(--app-surface-solid)_70%,transparent)] text-[var(--app-text-muted)] border-[var(--app-border)] cursor-not-allowed'
                    : chatMode === 'post'
                      ? 'app-button-primary border-transparent'
                      : 'app-button-secondary border-[var(--app-border)]'
                }`}
              >
                Post
              </button>
            </div>

            {chatMode === 'post' && selectedPost ? (
              <p className="mt-3 text-xs app-muted">
                Discussing: <span className="font-semibold">{selectedPost.title}</span>
              </p>
            ) : null}
          </div>

          {chatMode === 'global' && chatError ? <p className="app-error text-sm m-4 p-3 rounded-xl">{chatError}</p> : null}
          {chatMode === 'post' && postChatError ? <p className="app-error text-sm m-4 p-3 rounded-xl">{postChatError}</p> : null}

          {chatMode === 'global' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatListRef}>
                {chatMessages.length > 0 ? (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className="app-panel rounded-2xl p-3 border-l-4"
                      style={{ borderLeftColor: pickMessageBorderColor(message) }}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <strong className="text-sm app-heading">{message.senderName}</strong>
                        <span className="app-muted text-xs">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-sm app-heading leading-relaxed">{message.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center app-muted text-sm py-8">No messages yet. Start the conversation!</p>
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="p-4 border-t border-[var(--app-border)] flex gap-2">
                <input
                  type="text"
                  placeholder="Write a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="app-input flex-1"
                />
                <button type="submit" className="app-button-primary px-4 py-2 rounded-xl font-semibold transition text-sm">
                  Send
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={postChatListRef}>
                {postChatMessages.length > 0 ? (
                  postChatMessages.map((message) => (
                    <div
                      key={message.id}
                      className="app-panel rounded-2xl p-3 border-l-4"
                      style={{ borderLeftColor: pickMessageBorderColor(message) }}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <strong className="text-sm app-heading">{message.senderName}</strong>
                        <span className="app-muted text-xs">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-sm app-heading leading-relaxed">{message.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center app-muted text-sm py-8">
                    {selectedPostId ? 'No messages yet. Start the discussion!' : 'Select a post to open its chat.'}
                  </p>
                )}
              </div>

              <form onSubmit={handleSendPostChatMessage} className="p-4 border-t border-[var(--app-border)] flex gap-2">
                <input
                  type="text"
                  placeholder={selectedPostId ? 'Write a message...' : 'Select a post to chat...'}
                  value={postChatInput}
                  onChange={(e) => setPostChatInput(e.target.value)}
                  disabled={!selectedPostId}
                  className="app-input flex-1 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!selectedPostId}
                  className="app-button-primary px-4 py-2 rounded-xl font-semibold transition text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
