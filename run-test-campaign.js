const campaignScheduler = require('./src/services/campaignScheduler');

async function main() {
    console.log('🚀 Triggering Campaign #3 via CampaignScheduler pipeline...');
    await campaignScheduler.runCampaign(3);
    console.log('🎉 Pipeline run finished!');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Pipeline run error:', err.message);
    process.exit(1);
});
