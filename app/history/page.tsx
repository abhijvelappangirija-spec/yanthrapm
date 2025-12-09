"use client"
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key must be provided in .env.local');
}
const supabase = createClient(supabaseUrl, supabaseKey);


export default function HistoryPage() {
    const [brds, setBrds] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeBrdId, setActiveBrdId] = useState<string | null>(null);
    const [sprints, setSprints] = useState<{ [key: string]: any[] }>({});


    useEffect(() => {
        async function fetchBrds() {
            const { data, error } = await supabase.from('brds').select('*')
                .eq('user_id', 'user-123');
            if (!error) setBrds(data);
        }
        fetchBrds();
    }, []);

    async function handleOpenModal(brdId: string) {
        setActiveBrdId(brdId);
        setModalOpen(true);
        if (!sprints[brdId]) {
            const { data, error } = await supabase.from('sprints').select('*').eq('brd_id', brdId);
            if (!error) setSprints(prev => ({ ...prev, [brdId]: data }));
        }
    }

    function handleCloseModal() {
        setModalOpen(false);
        setActiveBrdId(null);
    }
    return (
        <div className="max-w-5xl mx-auto py-10">
            <h2 className="text-2xl font-bold mb-6">BRD History</h2>
            <table className="min-w-full bg-white border rounded shadow">
                <thead>
                    <tr>
                        <th className="text-start px-4 py-2 border-b">Project Name</th>
                        <th className="text-start px-4 py-2 border-b">Created At</th>
                        <th className="text-start px-4 py-2 border-b">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {brds.map(brd => (
                        <>
                            <tr key={brd.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border-b max-w-xs">
                                    <span className="block brd-name-clamp">
                                        {brd.raw_input || brd.projectName || 'Untitled'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 border-b">{new Date(brd.created_at).toLocaleString()}</td>
                                <td className="px-4 py-2 border-b">
                                    <button
                                        className="text-blue-600 hover:underline"
                                        onClick={() => handleOpenModal(brd.id)}
                                    >
                                        View Sprints
                                    </button>
                                </td>
                            </tr>
                            {modalOpen && activeBrdId === brd.id && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
                                        <button
                                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
                                            onClick={handleCloseModal}
                                            aria-label="Close"
                                        >
                                            &times;
                                        </button>
                                        <h3 className="text-xl font-bold mb-4">Sprint Details</h3>
                                        {Array.isArray(sprints[brd.id]) && sprints[brd.id].length > 0 ? (
                                            sprints[brd.id].map(sprint => (
                                                <div key={sprint.id} className="mb-6">
                                                    <div className="mb-2">
                                                        <strong>Team Members:</strong> {sprint.team_members} | <strong>Capacity/Member:</strong> {sprint.capacity_per_member} | <strong>Sprint Duration (weeks):</strong> {sprint.sprint_duration} | <strong>Velocity:</strong> {sprint.velocity}
                                                    </div>
                                                    <div className="mb-2">
                                                        <strong>Total Stories:</strong> {sprint.stories_count} | <strong>Suggested Story Points/Sprint:</strong> {sprint.suggested_story_points}
                                                    </div>
                                                    <h4 className="font-semibold mt-4 mb-2">Epics & Stories</h4>
                                                    <table className="min-w-full bg-white border rounded mb-4">
                                                        <thead>
                                                            <tr>
                                                                <th className="text-start px-2 py-1 border-b">Epic</th>
                                                                <th className="text-start px-2 py-1 border-b">Story</th>
                                                                <th className="text-start px-2 py-1 border-b">Points</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sprint.story_groups && sprint.story_groups.map((epic: any) => (
                                                                epic.stories.map((story: any) => (
                                                                    <tr key={story.id}>
                                                                        <td className="px-2 py-1 border-b">{epic.name}</td>
                                                                        <td className="px-2 py-1 border-b">{story.title}</td>
                                                                        <td className="px-2 py-1 border-b">{story.storyPoints}</td>
                                                                    </tr>
                                                                ))
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <h4 className="font-semibold mt-4 mb-2">Sprint Breakdown</h4>
                                                    <table className="min-w-full bg-white border rounded">
                                                        <thead>
                                                            <tr>
                                                                <th className="text-start px-2 py-1 border-b">Sprint #</th>
                                                                <th className="text-start px-2 py-1 border-b">Goal</th>
                                                                <th className="text-start px-2 py-1 border-b">Story Points</th>
                                                                <th className="text-start px-2 py-1 border-b">Stories Planned</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sprint.sprint_breakdown && sprint.sprint_breakdown.map((sb: any, idx: number) => (
                                                                <tr key={idx}>
                                                                    <td className="px-2 py-1 border-b">{sb.sprintNumber}</td>
                                                                    <td className="px-2 py-1 border-b">{sb.goal}</td>
                                                                    <td className="px-2 py-1 border-b">{sb.capacityStoryPoints}</td>
                                                                    <td className="px-2 py-1 border-b">
                                                                        {sb.storiesPlanned && sb.storiesPlanned.map((sp: any) => (
                                                                            <div key={sp.id}>
                                                                                <span className="font-semibold">{sp.id}</span> (Epic: {sp.epicId}, Points: {sp.storyPoints})
                                                                            </div>
                                                                        ))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-gray-500 italic">Sprint not created</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
