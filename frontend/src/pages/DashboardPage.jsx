import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatDate(value) {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString()
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
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [posts, setPosts] = useState([])
  const [selectedPostId, setSelectedPostId] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postForm, setPostForm] = useState({ title: '', content: '' })
  const [postError, setPostError] = useState('')
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState('')
  const socketRef = useRef(null)
  const chatListRef = useRef(null)

  const selectedPostIsOwner = useMemo(() => {
    if (!selectedPost || !user) return false
    return String(selectedPost.userId) === String(user.id)
  }, [selectedPost, user])

  // Initialize auth
  useEffect(() => {
    const storedToken = localStorage.getItem('blog_token')
    const storedUser = localStorage.getItem('blog_user')

    if (!storedToken || !storedUser) {
      navigate('/login')
      return
    }

    setToken(storedToken)
    try {
      setUser(JSON.parse(storedUser))
    } catch {
      navigate('/login')
    }
  }, [navigate])

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
    })

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

    socket.on('connect_error', (error) => {
      setChatError(error.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, user])

  // Auto-scroll chat
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight
    }
  }, [chatMessages])

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

  function handleLogout() {
    localStorage.removeItem('blog_token')
    localStorage.removeItem('blog_user')
    navigate('/login')
  }

  if (!user || !token) {
    return <div className="flex items-center justify-center h-screen text-gray-600">Loading...</div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Platform</h1>
            <p className="text-gray-600 text-sm mt-1">Write, share, and connect in real time</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">Logged in as <span className="font-semibold">{user.name}</span></span>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex gap-0 w-full overflow-hidden">
        <section className="w-[70%] flex flex-col gap-6 overflow-y-auto p-6 border-r border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{selectedPost ? 'View & Edit Post' : 'Blog Posts'}</h2>
            {selectedPost && (
              <button onClick={() => setSelectedPostId(null)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm">
                ← Back to posts
              </button>
            )}
          </div>

          {loadingPosts ? (
            <p className="text-gray-600">Loading posts...</p>
          ) : !selectedPost ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition transform"
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{post.title}</h3>
                      <small className="text-gray-500 whitespace-nowrap text-xs">{formatDate(post.createdAt)}</small>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-2 mb-2">{post.content.substring(0, 100)}...</p>
                    <p className="text-gray-600 text-xs">by {post.authorName}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 col-span-full text-center py-8">No posts yet. Create one!</p>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start gap-4 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">By {selectedPost.authorName}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedPost.title}</h3>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(selectedPost.createdAt)}</span>
              </div>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-6">{selectedPost.content}</div>
              {selectedPostIsOwner && (
                <div className="flex gap-2">
                  <button onClick={handleDeletePost} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-semibold">
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedPost ? 'Edit Post' : 'Create New Post'}</h3>
            <form onSubmit={handleCreateOrUpdatePost} className="space-y-4">
              <input
                type="text"
                placeholder="Post title"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                rows="6"
                placeholder="Post content"
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                {selectedPost ? 'Update Post' : 'Publish Post'}
              </button>
            </form>
            {postError && <p className="text-red-600 text-sm mt-4 bg-red-50 p-3 rounded">{postError}</p>}
          </div>
        </section>

        <aside className="w-[30%] flex flex-col bg-white border-l border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Global Chat</h2>
            <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">Live</span>
          </div>

          {chatError && <p className="text-red-600 text-sm m-4 bg-red-50 p-3 rounded">{chatError}</p>}

          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatListRef}>
            {chatMessages.length > 0 ? (
              chatMessages.map((message) => (
                <div key={message.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-600">
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <strong className="text-sm text-gray-900">{message.senderName}</strong>
                    <span className="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{message.content}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 text-sm py-8">No messages yet. Start the conversation!</p>
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="p-4 border-t border-gray-200 flex gap-2">
            <input
              type="text"
              placeholder="Write a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">
              Send
            </button>
          </form>
        </aside>
      </main>
    </div>
  )
}
