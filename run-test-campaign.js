const campaignScheduler = require('./src/services/campaignScheduler');

async function main() {
    const campaignId = parseInt(process.argv[2], 10) || 4;
    console.log(`🚀 Triggering Campaign #${campaignId} via CampaignScheduler pipeline...`);
    await campaignScheduler.runCampaign(campaignId);
    console.log('🎉 Pipeline run finished!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Pipeline run error:', err.message);
    process.exit(1);
});
