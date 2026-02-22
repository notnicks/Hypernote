import { useState } from 'react'
import { Info, Github, Globe, Heart } from 'lucide-react'

function About({ theme, onClose }) {
    const [versions] = useState(window.electron.process.versions)

    return (
        <div className={`flex flex-col h-full overflow-y-auto p-8 max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
            <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-200'}`}>
                    <Info size={48} className="text-blue-500" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Hypernote</h1>
                    <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Version 2.1.0
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <section>
                    <p className="text-lg leading-relaxed">
                        Hypernote is a handy little text editor, the one I always wanted but never got round to building. It supports markdown and a little mermaid.
                        Oh it has some handy network views, wiki linking and tagging too.
                    </p>
                </section>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Github size={18} /> Source Code
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Check out the project on GitHub and contribute to its development.
                        </p>
                    </div>
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Globe size={18} /> Website
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <a href="https://www.notnick.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-500">
                                www.notnick.com
                            </a>
                        </p>
                    </div>
                </div>

                <section className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <h2 className="text-xl font-bold mb-4">Software Details</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Electron</span>
                            <p className="font-mono">v{versions.electron}</p>
                        </div>
                        <div>
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Chrome</span>
                            <p className="font-mono">v{versions.chrome}</p>
                        </div>
                        <div>
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Node.js</span>
                            <p className="font-mono">v{versions.node}</p>
                        </div>
                        <div>
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>V8</span>
                            <p className="font-mono">v{versions.v8}</p>
                        </div>
                    </div>
                </section>

                <footer className="pt-8 flex flex-col items-center gap-4">
                    <p className="flex items-center gap-2 text-sm italic opacity-70">
                        Made with <Heart size={16} className="text-red-500 fill-red-500" /> by the Hypernote team
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${theme === 'dark'
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                            }`}
                    >
                        Back to Editor
                    </button>
                </footer>
            </div>
        </div >
    )
}

export default About
